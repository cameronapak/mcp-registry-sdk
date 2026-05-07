import { assertEquals } from "jsr:@std/assert";
import {
  StdioTransportSchema,
  StreamableHttpTransportSchema,
  SseTransportSchema,
  IconSchema,
  InputSchema,
  PositionalArgumentSchema,
  NamedArgumentSchema,
  ArgumentSchema,
  KeyValueInputSchema,
  RepositorySchema,
  PackageSchema,
  ServerJSONSchema,
  StatusUpdateRequestSchema,
  AllVersionsStatusResponseSchema,
  RegistryExtensionsSchema,
  ServerResponseMetaSchema,
  ListServersOptionsSchema,
  HealthBodySchema,
  PingBodySchema,
  ValidationResultSchema,
  LocalTransportSchema,
  RemoteTransportSchema,
} from "../index.ts";

// ---- Transport schemas ----

Deno.test("StdioTransportSchema validates correct type", () => {
  const result = StdioTransportSchema.safeParse({ type: "stdio" as const });
  assertEquals(result.success, true);
});

Deno.test("StdioTransportSchema rejects invalid type", () => {
  const result = StdioTransportSchema.safeParse({ type: "invalid" });
  assertEquals(result.success, false);
});

Deno.test("StreamableHttpTransportSchema validates with required fields", () => {
  const result = StreamableHttpTransportSchema.safeParse({
    type: "streamable-http" as const,
    url: "https://example.com/mcp",
  });
  assertEquals(result.success, true);
});

Deno.test("StreamableHttpTransportSchema validates with KeyValueInput headers", () => {
  const result = StreamableHttpTransportSchema.safeParse({
    type: "streamable-http" as const,
    url: "https://example.com/mcp",
    headers: [{ name: "Authorization", value: "Bearer token" }],
  });
  assertEquals(result.success, true);
});

Deno.test("StreamableHttpTransportSchema rejects headers without name", () => {
  const result = StreamableHttpTransportSchema.safeParse({
    type: "streamable-http" as const,
    url: "https://example.com/mcp",
    headers: [{ value: "Bearer token" }],
  });
  assertEquals(result.success, false);
});

Deno.test("StreamableHttpTransportSchema rejects missing url", () => {
  const result = StreamableHttpTransportSchema.safeParse({
    type: "streamable-http" as const,
  });
  assertEquals(result.success, false);
});

Deno.test("StreamableHttpTransportSchema validates URL template variables", () => {
  const result = StreamableHttpTransportSchema.safeParse({
    type: "streamable-http" as const,
    url: "{base_url}/mcp",
  });
  assertEquals(result.success, true);
});

Deno.test("SseTransportSchema validates with required fields", () => {
  const result = SseTransportSchema.safeParse({
    type: "sse" as const,
    url: "https://example.com/events",
  });
  assertEquals(result.success, true);
});

// ---- Icon schema ----

Deno.test("IconSchema validates with required src field", () => {
  const result = IconSchema.safeParse({ src: "https://example.com/icon.png" });
  assertEquals(result.success, true);
});

Deno.test("IconSchema validates with all optional fields", () => {
  const result = IconSchema.safeParse({
    src: "https://example.com/icon.png",
    mimeType: "image/png" as const,
    sizes: ["32x32", "64x64"],
    theme: "light" as const,
  });
  assertEquals(result.success, true);
});

Deno.test("IconSchema accepts valid mimeType values", () => {
  for (const mimeType of ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"]) {
    const result = IconSchema.safeParse({ src: "https://example.com/icon.png", mimeType });
    assertEquals(result.success, true, `${mimeType} should be valid`);
  }
});

Deno.test("IconSchema rejects invalid mimeType", () => {
  const result = IconSchema.safeParse({ src: "https://example.com/icon.png", mimeType: "image/tiff" });
  assertEquals(result.success, false);
});

Deno.test("IconSchema validates sizes patterns", () => {
  assertEquals(IconSchema.safeParse({ src: "https://example.com/i.png", sizes: ["32x32", "128x128"] }).success, true);
  assertEquals(IconSchema.safeParse({ src: "https://example.com/i.png", sizes: ["any"] }).success, true);
  assertEquals(IconSchema.safeParse({ src: "https://example.com/i.png", sizes: ["invalid"] }).success, false);
});

Deno.test("IconSchema rejects non-URL src", () => {
  assertEquals(IconSchema.safeParse({ src: "not-a-url" }).success, false);
});

Deno.test("IconSchema rejects src exceeding 255 characters", () => {
  assertEquals(IconSchema.safeParse({ src: "https://example.com/" + "a".repeat(300) }).success, false);
});

// ---- Input & Argument schemas ----

Deno.test("InputSchema accepts placeholder field", () => {
  const result = InputSchema.safeParse({
    description: "A port number",
    placeholder: "8080",
    format: "number",
  });
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.placeholder, "8080");
  }
});

Deno.test("InputSchema accepts format enum values", () => {
  for (const format of ["string", "number", "boolean", "filepath"]) {
    assertEquals(InputSchema.safeParse({ format }).success, true, `${format} should be valid`);
  }
  assertEquals(InputSchema.safeParse({ format: "invalid" }).success, false);
});

Deno.test("PositionalArgumentSchema validates correctly", () => {
  const result = PositionalArgumentSchema.safeParse({
    type: "positional",
    valueHint: "FILE",
    description: "Input file",
    isRepeated: true,
  });
  assertEquals(result.success, true);
});

Deno.test("NamedArgumentSchema validates correctly", () => {
  const result = NamedArgumentSchema.safeParse({
    type: "named",
    name: "--port",
    description: "Port number",
    format: "number",
  });
  assertEquals(result.success, true);
});

Deno.test("NamedArgumentSchema requires name", () => {
  const result = NamedArgumentSchema.safeParse({
    type: "named",
    description: "Missing name field",
  });
  assertEquals(result.success, false);
});

Deno.test("ArgumentSchema discriminates on type", () => {
  assertEquals(
    ArgumentSchema.safeParse({ type: "positional", valueHint: "FILE" }).success,
    true,
  );
  assertEquals(
    ArgumentSchema.safeParse({ type: "named", name: "--port" }).success,
    true,
  );
  assertEquals(
    ArgumentSchema.safeParse({ type: "invalid" }).success,
    false,
  );
});

Deno.test("ArgumentSchema supports template variables", () => {
  const result = ArgumentSchema.safeParse({
    type: "named",
    name: "--mount",
    value: "type={mount_type},source={source}",
    variables: {
      mount_type: { description: "Mount type", choices: ["bind", "volume"] },
      source: { description: "Source path", format: "filepath" },
    },
  });
  assertEquals(result.success, true);
});

// ---- KeyValueInput ----

Deno.test("KeyValueInputSchema requires name", () => {
  assertEquals(KeyValueInputSchema.safeParse({ name: "API_KEY", isSecret: true }).success, true);
  assertEquals(KeyValueInputSchema.safeParse({ isSecret: true }).success, false);
});

// ---- Repository ----

Deno.test("RepositorySchema accepts full and partial objects", () => {
  // Full object
  assertEquals(
    RepositorySchema.safeParse({ url: "https://github.com/org/repo", source: "github" }).success,
    true,
  );
  // Legacy: missing url/source (API returns these for old servers)
  assertEquals(RepositorySchema.safeParse({ source: "github" }).success, true);
  assertEquals(RepositorySchema.safeParse({ url: "https://github.com/org/repo" }).success, true);
  assertEquals(RepositorySchema.safeParse({}).success, true);
  // Invalid url format
  assertEquals(RepositorySchema.safeParse({ url: "not-a-url", source: "github" }).success, false);
});

// ---- Package ----

Deno.test("PackageSchema requires identifier and transport", () => {
  const valid = {
    registryType: "npm",
    identifier: "@org/pkg",
    transport: { type: "stdio" as const },
  };
  assertEquals(PackageSchema.safeParse(valid).success, true);

  assertEquals(PackageSchema.safeParse({ registryType: "npm", identifier: "@org/pkg" }).success, false);
  assertEquals(PackageSchema.safeParse({ registryType: "npm", transport: { type: "stdio" } }).success, false);
});

Deno.test("PackageSchema validates fileSha256 pattern", () => {
  const base = { registryType: "npm", identifier: "pkg", transport: { type: "stdio" as const } };
  assertEquals(PackageSchema.safeParse({ ...base, fileSha256: "a".repeat(64) }).success, true);
  assertEquals(PackageSchema.safeParse({ ...base, fileSha256: "z".repeat(64) }).success, false);
  assertEquals(PackageSchema.safeParse({ ...base, fileSha256: "abc" }).success, false);
});

// ---- ServerJSON ----

const SCHEMA_URL =
  "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json";

Deno.test("ServerJSONSchema validates name pattern", () => {
  const base = { $schema: SCHEMA_URL, description: "A server", version: "1.0.0" };
  assertEquals(ServerJSONSchema.safeParse({ ...base, name: "org/server" }).success, true);
  assertEquals(ServerJSONSchema.safeParse({ ...base, name: "io.example/my-server" }).success, true);
  assertEquals(ServerJSONSchema.safeParse({ ...base, name: "no-slash" }).success, false);
  assertEquals(ServerJSONSchema.safeParse({ ...base, name: "ab" }).success, false); // too short
});

Deno.test("ServerJSONSchema accepts title field", () => {
  const result = ServerJSONSchema.safeParse({
    $schema: SCHEMA_URL,
    name: "org/server",
    title: "My Server",
    description: "A server",
    version: "1.0.0",
  });
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.title, "My Server");
  }
});

Deno.test("ServerJSONSchema requires $schema", () => {
  const result = ServerJSONSchema.safeParse({
    name: "org/server",
    description: "A server",
    version: "1.0.0",
  });
  assertEquals(result.success, false);
});

Deno.test("ServerJSONSchema enforces description max 100", () => {
  assertEquals(
    ServerJSONSchema.safeParse({
      $schema: SCHEMA_URL,
      name: "org/server",
      description: "a".repeat(101),
      version: "1.0.0",
    }).success,
    false,
  );
});

Deno.test("ServerJSONSchema enforces version max 255", () => {
  assertEquals(
    ServerJSONSchema.safeParse({
      $schema: SCHEMA_URL,
      name: "org/server",
      description: "A server",
      version: "v".repeat(256),
    }).success,
    false,
  );
});

// ---- RegistryExtensions ----

Deno.test("RegistryExtensionsSchema accepts statusMessage and statusChangedAt", () => {
  const result = RegistryExtensionsSchema.safeParse({
    publishedAt: "2025-01-01T00:00:00Z",
    isLatest: true,
    status: "deprecated",
    statusMessage: "Use v2 instead",
    statusChangedAt: "2025-06-01T00:00:00Z",
  });
  assertEquals(result.success, true);
});

Deno.test("RegistryExtensionsSchema rejects statusMessage over 500 chars", () => {
  const result = RegistryExtensionsSchema.safeParse({
    publishedAt: "2025-01-01T00:00:00Z",
    isLatest: true,
    status: "deprecated",
    statusChangedAt: "2025-06-01T00:00:00Z",
    statusMessage: "x".repeat(501),
  });
  assertEquals(result.success, false);
});

Deno.test("RegistryExtensionsSchema status must be valid enum", () => {
  const base = {
    publishedAt: "2025-01-01T00:00:00Z",
    isLatest: true,
    statusChangedAt: "2025-06-01T00:00:00Z",
  };
  assertEquals(RegistryExtensionsSchema.safeParse({ ...base, status: "active" }).success, true);
  assertEquals(RegistryExtensionsSchema.safeParse({ ...base, status: "deprecated" }).success, true);
  assertEquals(RegistryExtensionsSchema.safeParse({ ...base, status: "deleted" }).success, true);
  assertEquals(RegistryExtensionsSchema.safeParse({ ...base, status: "invalid" }).success, false);
});

Deno.test("RegistryExtensionsSchema requires status and statusChangedAt", () => {
  // missing both
  assertEquals(
    RegistryExtensionsSchema.safeParse({
      publishedAt: "2025-01-01T00:00:00Z",
      isLatest: true,
    }).success,
    false,
  );
  // missing statusChangedAt
  assertEquals(
    RegistryExtensionsSchema.safeParse({
      publishedAt: "2025-01-01T00:00:00Z",
      isLatest: true,
      status: "active",
    }).success,
    false,
  );
});

// ---- ServerResponseMeta ----

Deno.test("ServerResponseMetaSchema requires official key", () => {
  const valid = {
    "io.modelcontextprotocol.registry/official": {
      publishedAt: "2025-01-01T00:00:00Z",
      isLatest: true,
      status: "active",
      statusChangedAt: "2025-01-01T00:00:00Z",
    },
  };
  assertEquals(ServerResponseMetaSchema.safeParse(valid).success, true);
  assertEquals(ServerResponseMetaSchema.safeParse({}).success, false);
});

// ---- StatusUpdateRequest ----

Deno.test("StatusUpdateRequestSchema validates", () => {
  assertEquals(StatusUpdateRequestSchema.safeParse({ status: "active" }).success, true);
  assertEquals(StatusUpdateRequestSchema.safeParse({ status: "deprecated", statusMessage: "Use v2" }).success, true);
  assertEquals(StatusUpdateRequestSchema.safeParse({ status: "deleted" }).success, true);
  assertEquals(StatusUpdateRequestSchema.safeParse({ status: "invalid" }).success, false);
  assertEquals(
    StatusUpdateRequestSchema.safeParse({ status: "deprecated", statusMessage: "x".repeat(501) }).success,
    false,
  );
});

Deno.test("StatusUpdateRequestSchema rejects statusMessage when status is active", () => {
  assertEquals(
    StatusUpdateRequestSchema.safeParse({
      status: "active",
      statusMessage: "should not be allowed",
    }).success,
    false,
  );
});

// ---- AllVersionsStatusResponse ----

Deno.test("AllVersionsStatusResponseSchema validates", () => {
  const result = AllVersionsStatusResponseSchema.safeParse({
    updatedCount: 2,
    servers: [],
  });
  assertEquals(result.success, true);
});

// ---- ListServersOptions ----

Deno.test("ListServersOptionsSchema accepts includeDeleted", () => {
  const result = ListServersOptionsSchema.safeParse({
    search: "test",
    includeDeleted: true,
  });
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.includeDeleted, true);
  }
});

// ---- PingBody / HealthBody ----

Deno.test("PingBodySchema validates { pong: boolean }", () => {
  assertEquals(PingBodySchema.safeParse({ pong: true }).success, true);
  assertEquals(PingBodySchema.safeParse({ pong: false }).success, true);
});

Deno.test("PingBodySchema rejects legacy { environment, version }", () => {
  assertEquals(
    PingBodySchema.safeParse({ environment: "prod", version: "1.0.0" }).success,
    false,
  );
});

Deno.test("HealthBodySchema accepts optional github_client_id", () => {
  assertEquals(HealthBodySchema.safeParse({ status: "ok" }).success, true);
  assertEquals(
    HealthBodySchema.safeParse({ status: "ok", github_client_id: "Iv23liUydBbI7Z2Q9bOZ" }).success,
    true,
  );
});

// ---- ValidationResult ----

Deno.test("ValidationResultSchema validates ok response", () => {
  assertEquals(
    ValidationResultSchema.safeParse({ valid: true, issues: [] }).success,
    true,
  );
  assertEquals(
    ValidationResultSchema.safeParse({ valid: true, issues: null }).success,
    true,
  );
});

Deno.test("ValidationResultSchema validates response with issues", () => {
  const result = ValidationResultSchema.safeParse({
    valid: false,
    issues: [
      {
        type: "schema",
        path: "$.name",
        message: "Required field missing",
        severity: "error",
        reference: "https://example.com/docs",
      },
    ],
  });
  assertEquals(result.success, true);
});

Deno.test("ValidationResultSchema rejects issue missing required fields", () => {
  const result = ValidationResultSchema.safeParse({
    valid: false,
    issues: [{ type: "schema", path: "$.name", message: "missing" }],
  });
  assertEquals(result.success, false);
});

// ---- Package tightening ----

Deno.test("PackageSchema rejects empty identifier and registryType", () => {
  assertEquals(
    PackageSchema.safeParse({
      registryType: "",
      identifier: "@org/pkg",
      transport: { type: "stdio" },
    }).success,
    false,
  );
  assertEquals(
    PackageSchema.safeParse({
      registryType: "npm",
      identifier: "",
      transport: { type: "stdio" },
    }).success,
    false,
  );
});

Deno.test("PackageSchema rejects 'latest' as version", () => {
  const result = PackageSchema.safeParse({
    registryType: "npm",
    identifier: "@org/pkg",
    transport: { type: "stdio" },
    version: "latest",
  });
  assertEquals(result.success, false);
});

Deno.test("PackageSchema rejects empty version", () => {
  const result = PackageSchema.safeParse({
    registryType: "npm",
    identifier: "@org/pkg",
    transport: { type: "stdio" },
    version: "",
  });
  assertEquals(result.success, false);
});

// ---- LocalTransport / RemoteTransport aliases ----

Deno.test("LocalTransportSchema is an alias for TransportSchema", () => {
  assertEquals(LocalTransportSchema.safeParse({ type: "stdio" }).success, true);
  assertEquals(
    LocalTransportSchema.safeParse({ type: "streamable-http", url: "https://x.com/mcp" }).success,
    true,
  );
});

Deno.test("RemoteTransportSchema accepts variables for URL templating", () => {
  const result = RemoteTransportSchema.safeParse({
    type: "streamable-http",
    url: "{baseUrl}/mcp",
    variables: {
      baseUrl: { description: "API base URL", default: "https://api.example.com" },
    },
  });
  assertEquals(result.success, true);
});
