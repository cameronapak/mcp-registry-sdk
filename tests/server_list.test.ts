import { assert, assertGreater, assertRejects } from "jsr:@std/assert";
import {
  MCPRegistryClient,
  RegistryError,
  type ListServersOptions,
  ServerListResponseSchema,
} from "../index.ts";

const defaultClient = new MCPRegistryClient();

Deno.test("client defaults to v0.1 API version", async () => {
  const client = new MCPRegistryClient();
  const response = await client.server.listServers();
  assert(response.metadata.count >= 0, "v0.1 API should return valid response");
});

Deno.test("client can be configured with v0 API version", async () => {
  const client = new MCPRegistryClient("https://registry.modelcontextprotocol.io", "v0");
  const response = await client.server.listServers();
  assert(response.metadata.count >= 0, "v0 API should return valid response");
});

Deno.test("listServers returns live registry data", async () => {
  const response = await defaultClient.server.listServers();
  const parse = ServerListResponseSchema.safeParse(response);

  if (!parse.success) {
    console.log("Schema validation error:", parse.error);
  }
  assert(parse.success === true, "ListServerResponse is valid");

  assertGreater(response.metadata.count, 0, "expected at least one server");

  const first = response.servers.at(0);
  if (first) {
    assert(typeof first.server.name === "string" && first.server.name.length > 0);
    assert(typeof first.server.version === "string" && first.server.version.length > 0);
  }
});

Deno.test("listServers respects limit option", async () => {
  const options: ListServersOptions = { limit: 1 };
  const response = await defaultClient.server.listServers(options);
  const parse = ServerListResponseSchema.safeParse(response);
  assert(parse.success === true, "ListServerResponse is valid");
  assert(response.servers.length <= 1, "expected response to honor limit <= 1");
});

Deno.test("listServers propagates RegistryError on bad base URL", async () => {
  const client = new MCPRegistryClient(
    "https://registry.modelcontextprotocol.io/does-not-exist",
  );
  await assertRejects(() => client.server.listServers(), RegistryError, "Failed to list servers");
});

Deno.test("listServers with includeDeleted", async () => {
  const response = await defaultClient.server.listServers({ includeDeleted: true, limit: 1 });
  assert(response.metadata.count >= 0, "includeDeleted should return valid response");
});

Deno.test("getServerVersion returns valid server for latest version", async () => {
  const response = await defaultClient.server.getServerVersion("ai.aliengiraffe/spotdb", "latest");
  assert(typeof response.server.name === "string" && response.server.name.length > 0);
  assert(typeof response.server.version === "string" && response.server.version.length > 0);
});

Deno.test("getServerVersion with includeDeleted", async () => {
  const response = await defaultClient.server.getServerVersion(
    "ai.aliengiraffe/spotdb",
    "latest",
    { includeDeleted: true },
  );
  assert(typeof response.server.name === "string" && response.server.name.length > 0);
});

Deno.test("listServerVersions returns array of server versions", async () => {
  const response = await defaultClient.server.listServerVersions("ai.aliengiraffe/spotdb");
  assert(Array.isArray(response.servers) && response.servers.length > 0);

  const first = response.servers.at(0);
  if (first) {
    assert(typeof first.server.name === "string" && first.server.name.length > 0);
    assert(typeof first.server.version === "string" && first.server.version.length > 0);
  }
});

Deno.test("listServerVersions with includeDeleted", async () => {
  const response = await defaultClient.server.listServerVersions("ai.aliengiraffe/spotdb", {
    includeDeleted: true,
  });
  assert(Array.isArray(response.servers) && response.servers.length > 0);
});

Deno.test("getServerVersion propagates RegistryError for non-existent server", async () => {
  await assertRejects(
    () => defaultClient.server.getServerVersion("non-existent-server-12345", "latest"),
    RegistryError,
    "Failed to get version",
  );
});

Deno.test("listServerVersions propagates RegistryError for non-existent server", async () => {
  await assertRejects(
    () => defaultClient.server.listServerVersions("non-existent-server-12345"),
    RegistryError,
    "Failed to list versions",
  );
});

Deno.test("v0 and v0.1 APIs return same data structure", async () => {
  const clientV0 = new MCPRegistryClient("https://registry.modelcontextprotocol.io", "v0");
  const clientV01 = new MCPRegistryClient("https://registry.modelcontextprotocol.io", "v0.1");

  const responseV0 = await clientV0.server.listServers();
  const responseV01 = await clientV01.server.listServers();

  assert(responseV0.metadata.count === responseV01.metadata.count);
  assert(Array.isArray(responseV0.servers) && Array.isArray(responseV01.servers));
});
