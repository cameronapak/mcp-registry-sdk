import { afterEach, expect, test } from "bun:test";
import { MCPRegistryClient, RegistryError } from "../index.ts";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const serverResponse = {
  server: {
    $schema: "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
    name: "com.example/server",
    description: "Example server",
    version: "1.0.0",
  },
  _meta: {
    "io.modelcontextprotocol.registry/official": {
      status: "active",
      statusChangedAt: "2026-01-01T00:00:00Z",
      publishedAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      isLatest: true,
    },
  },
};

const listResponse = {
  servers: [serverResponse],
  metadata: { count: 1, nextCursor: "next" },
};

function mockJsonResponse(body: unknown, status = 200): URL[] {
  const requests: URL[] = [];
  globalThis.fetch = (async (input) => {
    requests.push(new URL(String(input)));
    return Response.json(body, { status });
  }) as typeof fetch;
  return requests;
}

test("client defaults to the v0.1 API", async () => {
  const requests = mockJsonResponse(listResponse);
  await new MCPRegistryClient().server.listServers();
  expect(requests[0]?.pathname).toBe("/v0.1/servers");
});

test("client supports the development v0 API", async () => {
  const requests = mockJsonResponse(listResponse);
  await new MCPRegistryClient("https://registry.example", "v0").server.listServers();
  expect(requests[0]?.pathname).toBe("/v0/servers");
});

test("listServers serializes validated filters", async () => {
  const requests = mockJsonResponse(listResponse);
  const response = await new MCPRegistryClient().server.listServers({
    cursor: "opaque cursor",
    limit: 20,
    search: "weather server",
    updatedSince: "2026-01-01T00:00:00Z",
    version: "latest",
  });

  expect(response.servers?.[0]?.server.name).toBe("com.example/server");
  expect(requests[0]?.searchParams.get("cursor")).toBe("opaque cursor");
  expect(requests[0]?.searchParams.get("limit")).toBe("20");
  expect(requests[0]?.searchParams.get("search")).toBe("weather server");
  expect(requests[0]?.searchParams.get("updated_since")).toBe("2026-01-01T00:00:00Z");
  expect(requests[0]?.searchParams.get("version")).toBe("latest");
});

test("listServers rejects invalid options before fetching", async () => {
  let called = false;
  globalThis.fetch = (async () => {
    called = true;
    return Response.json(listResponse);
  }) as typeof fetch;

  await expect(
    new MCPRegistryClient().server.listServers({
      updatedSince: "2026-01-01T00:00:00Z",
      includeDeleted: false,
    }),
  ).rejects.toThrow("includeDeleted cannot be false");
  expect(called).toBe(false);
});

test("server names and versions are URL encoded", async () => {
  const requests = mockJsonResponse(serverResponse);
  await new MCPRegistryClient().server.getServerVersion(
    "com.example/server",
    "1.0.0+build",
    { includeDeleted: true },
  );

  expect(requests[0]?.pathname).toBe(
    "/v0.1/servers/com.example%2Fserver/versions/1.0.0%2Bbuild",
  );
  expect(requests[0]?.searchParams.get("include_deleted")).toBe("true");
});

test("listServerVersions parses nullable server arrays", async () => {
  mockJsonResponse({ servers: null, metadata: { count: 0 } });
  const response = await new MCPRegistryClient().server.listServerVersions(
    "com.example/server",
  );
  expect(response.servers).toBeNull();
});

test("non-success responses throw RegistryError with problem details", async () => {
  mockJsonResponse(
    {
      title: "Not Found",
      status: 404,
      detail: "Server does not exist",
    },
    404,
  );

  try {
    await new MCPRegistryClient().server.getServerVersion("com.example/missing", "latest");
    throw new Error("Expected request to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(RegistryError);
    expect((error as RegistryError).status).toBe(404);
    expect((error as Error).message).toContain("Server does not exist");
  }
});

test("successful responses are validated", async () => {
  mockJsonResponse({ servers: [{ server: { name: "broken" } }], metadata: { count: 1 } });
  await expect(new MCPRegistryClient().server.listServers()).rejects.toThrow();
});
