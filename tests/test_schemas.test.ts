import { expect, test } from "bun:test";
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

const assertEquals = (actual: unknown, expected: unknown, message?: string) => {
  expect(actual, message).toEqual(expected);
};

// ---- Transport schemas ----

test("StdioTransportSchema validates correct type", () => {
  const result = StdioTransportSchema.safeParse({ type: "stdio" as const });
  expect(result.success).toEqual(true);
});

test("StdioTransportSchema rejects invalid type", () => {
  const result = StdioTransportSchema.safeParse({ type: "invalid" });
  expect(result.success).toEqual(false);
});

test("StreamableHttpTransportSchema validates with required fields", () => {
  const result = StreamableHttpTransportSchema.safeParse({
    type: "streamable-http" as const,
    url: "https://example.com/mcp",
  });
  expect(result.success).toEqual(true);
});

test("StreamableHttpTransportSchema validates with KeyValueInput headers", () => {
  const result = StreamableHttpTransportSchema.safeParse({
    type: "streamable-http" as const,
    url: "https://example.com/mcp",
    headers: [{ name: "Authorization", value: "Bearer token" }],
  });
  expect(result.success).toEqual(true);
});

test("StreamableHttpTransportSchema rejects headers without name", () => {
  const result = StreamableHttpTransportSchema.safeParse({
    type: "streamable-http" as const,
    url: "https://example.com/mcp",
    headers: [{ value: "Bearer token" }],
  });
  expect(result.success).toEqual(false);
});

test("StreamableHttpTransportSchema rejects missing url", () => {
  const result = StreamableHttpTransportSchema.safeParse({
    type: "streamable-http" as const,
  });
  expect(result.success).toEqual(false);
});

test("StreamableHttpTransportSchema validates URL template variables", () => {
  const result = StreamableHttpTransportSchema.safeParse({
    type: "streamable-http" as const,
    url: "{base_url}/mcp",
  });
  expect(result.success).toEqual(true);
});

test("SseTransportSchema validates with required fields", () => {
  const result = SseTransportSchema.safeParse({
    type: "sse" as const,
    url: "https://example.com/events",
  });
  expect(result.success).toEqual(true);
});

// ---- Icon schema ----

test("IconSchema validates with required src field", () => {
  const result = IconSchema.safeParse({ src: "https://example.com/icon.png" });
  expect(result.success).toEqual(true);
});

test("IconSchema validates with all optional fields", () => {
  const result = IconSchema.safeParse({
    src: "https://example.com/icon.png",
    mimeType: "image/png" as const,
    sizes: ["32x32", "64x64"],
    theme: "light" as const,
  });
  expect(result.success).toEqual(true);
});

test("IconSchema accepts valid mimeType values", () => {
  for (const mimeType of ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"]) {
    const result = IconSchema.safeParse({ src: "https://example.com/icon.png", mimeType });
    assertEquals(result.success, true, `${mimeType} should be valid`);
  }
});

test("IconSchema rejects invalid mimeType", () => {
  const result = IconSchema.safeParse({ src: "https://example.com/icon.png", mimeType: "image/tiff" });
  expect(result.success).toEqual(false);
});

test("IconSchema validates sizes patterns", () => {
  assertEquals(IconSchema.safeParse({ src: "https://example.com/i.png", sizes: ["32x32", "128x128"] }).success, true);
  assertEquals(IconSchema.safeParse({ src: "https://example.com/i.png", sizes: ["any"] }).success, true);
  assertEquals(IconSchema.safeParse({ src: "https://example.com/i.png", sizes: ["invalid"] }).success, false);
});

test("IconSchema rejects non-URL src", () => {
  expect(IconSchema.safeParse({ src: "not-a-url" }).success).toEqual(false);
});

test("IconSchema rejects src exceeding 255 characters", () => {
  expect(IconSchema.safeParse({ src: "https://example.com/" + "a".repeat(300) }).success).toEqual(false);
});

// ---- Input & Argument schemas ----

test("InputSchema accepts placeholder field", () => {
  const result = InputSchema.safeParse({
    description: "A port number",
    placeholder: "8080",
    format: "number",
  });
  expect(result.success).toEqual(true);
  if (result.success) {
    expect(result.data.placeholder).toEqual("8080");
  }
});

test("InputSchema accepts format enum values", () => {
  for (const format of ["string", "number", "boolean", "filepath"]) {
    assertEquals(InputSchema.safeParse({ format }).success, true, `${format} should be valid`);
  }
  expect(InputSchema.safeParse({ format: "invalid" }).success).toEqual(false);
});

test("PositionalArgumentSchema validates correctly", () => {
  const result = PositionalArgumentSchema.safeParse({
    type: "positional",
    valueHint: "FILE",
    description: "Input file",
    isRepeated: true,
  });
  expect(result.success).toEqual(true);
});

test("NamedArgumentSchema validates correctly", () => {
  const result = NamedArgumentSchema.safeParse({
    type: "named",
    name: "--port",
    description: "Port number",
    format: "number",
  });
  expect(result.success).toEqual(true);
});

test("NamedArgumentSchema requires name", () => {
  const result = NamedArgumentSchema.safeParse({
    type: "named",
    description: "Missing name field",
  });
  expect(result.success).toEqual(false);
});

test("ArgumentSchema discriminates on type", () => {
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

test("ArgumentSchema supports template variables", () => {
  const result = ArgumentSchema.safeParse({
    type: "named",
    name: "--mount",
    value: "type={mount_type},source={source}",
    variables: {
      mount_type: { description: "Mount type", choices: ["bind", "volume"] },
      source: { description: "Source path", format: "filepath" },
    },
  });
  expect(result.success).toEqual(true);
});

// ---- KeyValueInput ----

test("KeyValueInputSchema requires name", () => {
  assertEquals(KeyValueInputSchema.safeParse({ name: "API_KEY", isSecret: true }).success, true);
  expect(KeyValueInputSchema.safeParse({ isSecret: true }).success).toEqual(false);
});

// ---- Repository ----

test("RepositorySchema accepts full and partial objects", () => {
  // Full object
  assertEquals(
    RepositorySchema.safeParse({ url: "https://github.com/org/repo", source: "github" }).success,
    true,
  );
  // Legacy: missing url/source (API returns these for old servers)
  expect(RepositorySchema.safeParse({ source: "github" }).success).toEqual(true);
  expect(RepositorySchema.safeParse({ url: "https://github.com/org/repo" }).success).toEqual(true);
  expect(RepositorySchema.safeParse({}).success).toEqual(true);
  // Invalid url format
  assertEquals(RepositorySchema.safeParse({ url: "not-a-url", source: "github" }).success, false);
});

// ---- Package ----

test("PackageSchema requires identifier and transport", () => {
  const valid = {
    registryType: "npm",
    identifier: "@org/pkg",
    transport: { type: "stdio" as const },
  };
  expect(PackageSchema.safeParse(valid).success).toEqual(true);

  assertEquals(PackageSchema.safeParse({ registryType: "npm", identifier: "@org/pkg" }).success, false);
  assertEquals(PackageSchema.safeParse({ registryType: "npm", transport: { type: "stdio" } }).success, false);
});

test("PackageSchema validates fileSha256 pattern", () => {
  const base = { registryType: "npm", identifier: "pkg", transport: { type: "stdio" as const } };
  assertEquals(PackageSchema.safeParse({ ...base, fileSha256: "a".repeat(64) }).success, true);
  assertEquals(PackageSchema.safeParse({ ...base, fileSha256: "z".repeat(64) }).success, false);
  assertEquals(PackageSchema.safeParse({ ...base, fileSha256: "abc" }).success, false);
});

// ---- ServerJSON ----

const SCHEMA_URL =
  "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json";

test("ServerJSONSchema validates name pattern", () => {
  const base = { $schema: SCHEMA_URL, description: "A server", version: "1.0.0" };
  assertEquals(ServerJSONSchema.safeParse({ ...base, name: "org/server" }).success, true);
  assertEquals(ServerJSONSchema.safeParse({ ...base, name: "io.example/my-server" }).success, true);
  assertEquals(ServerJSONSchema.safeParse({ ...base, name: "no-slash" }).success, false);
  assertEquals(ServerJSONSchema.safeParse({ ...base, name: "ab" }).success, false); // too short
});

test("ServerJSONSchema accepts title field", () => {
  const result = ServerJSONSchema.safeParse({
    $schema: SCHEMA_URL,
    name: "org/server",
    title: "My Server",
    description: "A server",
    version: "1.0.0",
  });
  expect(result.success).toEqual(true);
  if (result.success) {
    expect(result.data.title).toEqual("My Server");
  }
});

test("ServerJSONSchema requires $schema", () => {
  const result = ServerJSONSchema.safeParse({
    name: "org/server",
    description: "A server",
    version: "1.0.0",
  });
  expect(result.success).toEqual(false);
});

test("ServerJSONSchema enforces description max 100", () => {
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

test("ServerJSONSchema enforces version max 255", () => {
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

test("RegistryExtensionsSchema accepts statusMessage and statusChangedAt", () => {
  const result = RegistryExtensionsSchema.safeParse({
    publishedAt: "2025-01-01T00:00:00Z",
    isLatest: true,
    status: "deprecated",
    statusMessage: "Use v2 instead",
    statusChangedAt: "2025-06-01T00:00:00Z",
  });
  expect(result.success).toEqual(true);
});

test("RegistryExtensionsSchema rejects statusMessage over 500 chars", () => {
  const result = RegistryExtensionsSchema.safeParse({
    publishedAt: "2025-01-01T00:00:00Z",
    isLatest: true,
    status: "deprecated",
    statusChangedAt: "2025-06-01T00:00:00Z",
    statusMessage: "x".repeat(501),
  });
  expect(result.success).toEqual(false);
});

test("RegistryExtensionsSchema status must be valid enum", () => {
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

test("RegistryExtensionsSchema requires status and statusChangedAt", () => {
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

test("ServerResponseMetaSchema requires official key", () => {
  const valid = {
    "io.modelcontextprotocol.registry/official": {
      publishedAt: "2025-01-01T00:00:00Z",
      isLatest: true,
      status: "active",
      statusChangedAt: "2025-01-01T00:00:00Z",
    },
  };
  expect(ServerResponseMetaSchema.safeParse(valid).success).toEqual(true);
  expect(ServerResponseMetaSchema.safeParse({}).success).toEqual(false);
});

// ---- StatusUpdateRequest ----

test("StatusUpdateRequestSchema validates", () => {
  expect(StatusUpdateRequestSchema.safeParse({ status: "active" }).success).toEqual(true);
  assertEquals(StatusUpdateRequestSchema.safeParse({ status: "deprecated", statusMessage: "Use v2" }).success, true);
  expect(StatusUpdateRequestSchema.safeParse({ status: "deleted" }).success).toEqual(true);
  expect(StatusUpdateRequestSchema.safeParse({ status: "invalid" }).success).toEqual(false);
  assertEquals(
    StatusUpdateRequestSchema.safeParse({ status: "deprecated", statusMessage: "x".repeat(501) }).success,
    false,
  );
});

test("StatusUpdateRequestSchema rejects statusMessage when status is active", () => {
  assertEquals(
    StatusUpdateRequestSchema.safeParse({
      status: "active",
      statusMessage: "should not be allowed",
    }).success,
    false,
  );
});

// ---- AllVersionsStatusResponse ----

test("AllVersionsStatusResponseSchema validates", () => {
  const result = AllVersionsStatusResponseSchema.safeParse({
    updatedCount: 2,
    servers: [],
  });
  expect(result.success).toEqual(true);
});

// ---- ListServersOptions ----

test("ListServersOptionsSchema accepts includeDeleted", () => {
  const result = ListServersOptionsSchema.safeParse({
    search: "test",
    includeDeleted: true,
  });
  expect(result.success).toEqual(true);
  if (result.success) {
    expect(result.data.includeDeleted).toEqual(true);
  }
});

// ---- PingBody / HealthBody ----

test("PingBodySchema validates { pong: boolean }", () => {
  expect(PingBodySchema.safeParse({ pong: true }).success).toEqual(true);
  expect(PingBodySchema.safeParse({ pong: false }).success).toEqual(true);
});

test("PingBodySchema rejects legacy { environment, version }", () => {
  assertEquals(
    PingBodySchema.safeParse({ environment: "prod", version: "1.0.0" }).success,
    false,
  );
});

test("HealthBodySchema accepts optional github_client_id", () => {
  expect(HealthBodySchema.safeParse({ status: "ok" }).success).toEqual(true);
  assertEquals(
    HealthBodySchema.safeParse({ status: "ok", github_client_id: "Iv23liUydBbI7Z2Q9bOZ" }).success,
    true,
  );
});

// ---- ValidationResult ----

test("ValidationResultSchema validates ok response", () => {
  assertEquals(
    ValidationResultSchema.safeParse({ valid: true, issues: [] }).success,
    true,
  );
  assertEquals(
    ValidationResultSchema.safeParse({ valid: true, issues: null }).success,
    true,
  );
});

test("ValidationResultSchema validates response with issues", () => {
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
  expect(result.success).toEqual(true);
});

test("ValidationResultSchema rejects issue missing required fields", () => {
  const result = ValidationResultSchema.safeParse({
    valid: false,
    issues: [{ type: "schema", path: "$.name", message: "missing" }],
  });
  expect(result.success).toEqual(false);
});

// ---- Package tightening ----

test("PackageSchema rejects empty identifier and registryType", () => {
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

test("PackageSchema rejects 'latest' as version", () => {
  const result = PackageSchema.safeParse({
    registryType: "npm",
    identifier: "@org/pkg",
    transport: { type: "stdio" },
    version: "latest",
  });
  expect(result.success).toEqual(false);
});

test("PackageSchema rejects empty version", () => {
  const result = PackageSchema.safeParse({
    registryType: "npm",
    identifier: "@org/pkg",
    transport: { type: "stdio" },
    version: "",
  });
  expect(result.success).toEqual(false);
});

// ---- LocalTransport / RemoteTransport aliases ----

test("LocalTransportSchema is an alias for TransportSchema", () => {
  expect(LocalTransportSchema.safeParse({ type: "stdio" }).success).toEqual(true);
  assertEquals(
    LocalTransportSchema.safeParse({ type: "streamable-http", url: "https://x.com/mcp" }).success,
    true,
  );
});

test("RemoteTransportSchema accepts variables for URL templating", () => {
  const result = RemoteTransportSchema.safeParse({
    type: "streamable-http",
    url: "{baseUrl}/mcp",
    variables: {
      baseUrl: { description: "API base URL", default: "https://api.example.com" },
    },
  });
  expect(result.success).toEqual(true);
});
