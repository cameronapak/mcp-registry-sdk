import { assert, assertGreater, assertRejects } from "jsr:@std/assert";
import {
  MCPRegistryClient,
  RegistryError,
  type ListServersOptions,
  ServerListResponseSchema
} from "../index.ts";

const defaultClient = new MCPRegistryClient();

Deno.test("listServers returns live registry data", async () => {
  const response = await defaultClient.server.listServers();
  const parse = ServerListResponseSchema.safeParse(response);

  if (!parse.success) {
    console.log("Schema validation error:", parse.error);
  }
  assert(parse.success === true, "ListServerResponse is valid");

  assertGreater(
    response.metadata.count,
    0,
    "expected registry to contain at least one server",
  );

  const firstServer = response.servers.at(0);
  if (firstServer) {
    assert(
      typeof firstServer.server.name === "string" && firstServer.server.name.length > 0,
      "server name should be a non-empty string",
    );
    assert(
      typeof firstServer.server.version === "string" && firstServer.server.version.length > 0,
      "server version should be a non-empty string",
    );
  }
});

Deno.test("listServers respects limit option against live registry", async () => {
  const options: ListServersOptions = { limit: 1 };
  const response = await defaultClient.server.listServers(options);
  const parse = ServerListResponseSchema.safeParse(response);
  console.log(parse);
  if (parse.error) {
    console.log(parse.error);
  }
  assert(parse.success === true, "ListServerResponse is valid");

  assert(
    response.servers.length <= 1,
    "expected live registry response to honor limit <= 1",
  );
});

Deno.test("listServers propagates RegistryError on bad base URL", async () => {
  const client = new MCPRegistryClient(
    "https://registry.modelcontextprotocol.io/does-not-exist",
  );

  await assertRejects(
    () => client.server.listServers(),
    RegistryError,
    "Failed to list servers",
  );
});
