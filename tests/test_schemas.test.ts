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
  GenericServerJSONMetaSchema,
  GenericServerJSONSchema,
  ResponseRepositorySchema,
  ServerResponseSchema,
  SignatureTokenExchangeInputSchema,
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

test("StreamableHttpTransportSchema rejects unreleased leading URL templates", () => {
  const result = StreamableHttpTransportSchema.safeParse({
    type: "streamable-http" as const,
    url: "{base_url}/mcp",
  });
  expect(result.success).toEqual(false);
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

test("RepositorySchema requires a matching source and clean repository URL", () => {
  assertEquals(
    RepositorySchema.safeParse({ url: "https://github.com/org/repo", source: "github" }).success,
    true,
  );
  expect(RepositorySchema.safeParse({ source: "github" }).success).toEqual(false);
  expect(RepositorySchema.safeParse({ url: "https://github.com/org/repo" }).success).toEqual(false);
  expect(RepositorySchema.safeParse({}).success).toEqual(false);
  assertEquals(RepositorySchema.safeParse({ url: "not-a-url", source: "github" }).success, false);
  assertEquals(
    RepositorySchema.safeParse({ url: "https://gitlab.com/org/repo", source: "github" }).success,
    false,
  );
  assertEquals(
    RepositorySchema.safeParse({
      url: "https://github.com/org/repo",
      source: "github",
      subfolder: "../outside",
    }).success,
    false,
  );
});

test("ResponseRepositorySchema accepts legacy partial repositories", () => {
  expect(ResponseRepositorySchema.safeParse({ source: "github" }).success).toEqual(true);
  expect(ResponseRepositorySchema.safeParse({ url: "https://github.com/org/repo" }).success).toEqual(true);
  expect(ResponseRepositorySchema.safeParse({}).success).toEqual(true);
});

// ---- Package ----

test("PackageSchema requires identifier and transport", () => {
  const valid = {
    registryType: "npm",
    identifier: "@org/pkg",
    version: "1.0.0",
    transport: { type: "stdio" as const },
  };
  expect(PackageSchema.safeParse(valid).success).toEqual(true);

  assertEquals(PackageSchema.safeParse({ registryType: "npm", identifier: "@org/pkg" }).success, false);
  assertEquals(PackageSchema.safeParse({ registryType: "npm", transport: { type: "stdio" } }).success, false);
});

test("PackageSchema validates fileSha256 pattern", () => {
  const base = {
    registryType: "mcpb",
    identifier: "https://github.com/org/repo/releases/download/v1/server.mcpb",
    transport: { type: "stdio" as const },
  };
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

test("ServerResponseMetaSchema accepts absent official metadata", () => {
  const valid = {
    "io.modelcontextprotocol.registry/official": {
      publishedAt: "2025-01-01T00:00:00Z",
      isLatest: true,
      status: "active",
      statusChangedAt: "2025-01-01T00:00:00Z",
    },
  };
  expect(ServerResponseMetaSchema.safeParse(valid).success).toEqual(true);
  expect(ServerResponseMetaSchema.safeParse({}).success).toEqual(true);
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

test("RemoteTransportSchema validates declared variables inside HTTPS URLs", () => {
  const result = RemoteTransportSchema.safeParse({
    type: "streamable-http",
    url: "https://{tenant}.example.com/mcp",
    variables: {
      tenant: { description: "Tenant" },
    },
  });
  expect(result.success).toEqual(true);
  expect(
    RemoteTransportSchema.safeParse({
      type: "streamable-http",
      url: "https://{tenant}.example.com/mcp",
    }).success,
  ).toEqual(false);
});

test("server and package versions reject aliases and ranges", () => {
  const server = {
    $schema: SCHEMA_URL,
    name: "org/server",
    description: "A server",
  };
  for (const version of ["", "latest", "^1.2.3", "1.2 - 2.0", "1.x", "1.2 || 2.0"]) {
    expect(ServerJSONSchema.safeParse({ ...server, version }).success).toEqual(false);
  }

  const pkg = {
    registryType: "cargo",
    identifier: "mcp-server",
    transport: { type: "stdio" },
  };
  expect(PackageSchema.safeParse({ ...pkg, version: "1.2.3" }).success).toEqual(true);
  expect(PackageSchema.safeParse({ ...pkg, version: ">=1" }).success).toEqual(false);
});

test("official package schemas enforce registry-specific fields", () => {
  const transport = { type: "stdio" };
  expect(
    PackageSchema.safeParse({ registryType: "cargo", identifier: "pkg", version: "1.0.0", transport }).success,
  ).toEqual(true);
  expect(
    PackageSchema.safeParse({ registryType: "cargo", identifier: "pkg", version: "1.0.0", registryBaseUrl: "https://example.com", transport }).success,
  ).toEqual(false);
  expect(
    PackageSchema.safeParse({ registryType: "oci", identifier: "quay.io/org/image:1.0", transport }).success,
  ).toEqual(true);
  expect(
    PackageSchema.safeParse({ registryType: "oci", identifier: "org/image:1.0", transport }).success,
  ).toEqual(true);
  expect(
    PackageSchema.safeParse({ registryType: "oci", identifier: "evil.example/org/image:1.0", transport }).success,
  ).toEqual(false);
  expect(
    PackageSchema.safeParse({ registryType: "mcpb", identifier: "https://github.com/org/repo/releases/download/v1/server.mcpb", transport }).success,
  ).toEqual(false);
  expect(
    PackageSchema.safeParse({
      registryType: "mcpb",
      identifier: "https://github.com/org/repo/not-a-release/server.mcpb",
      fileSha256: "a".repeat(64),
      transport,
    }).success,
  ).toEqual(false);
  expect(
    PackageSchema.safeParse({ registryType: "unknown", identifier: "pkg", version: "1.0.0", transport }).success,
  ).toEqual(false);
});

test("package transport templates must reference declared inputs", () => {
  const pkg = {
    registryType: "npm",
    identifier: "@org/pkg",
    version: "1.0.0",
    transport: { type: "streamable-http", url: "https://example.com/{token}" },
  };
  expect(PackageSchema.safeParse(pkg).success).toEqual(false);
  expect(
    PackageSchema.safeParse({
      ...pkg,
      environmentVariables: [{ name: "token", isSecret: true }],
    }).success,
  ).toEqual(true);
});

test("official publisher metadata enforces 4 KiB and generic metadata preserves extensions", () => {
  expect(
    ServerJSONSchema.safeParse({
      $schema: SCHEMA_URL,
      name: "org/server",
      description: "A server",
      version: "1.0.0",
      _meta: {
        "io.modelcontextprotocol.registry/publisher-provided": { value: "x".repeat(4096) },
      },
    }).success,
  ).toEqual(false);

  const generic = GenericServerJSONMetaSchema.parse({ "com.example/custom": { enabled: true } });
  expect(generic["com.example/custom"]).toEqual({ enabled: true });
});

test("official schemas reject unknown fields while the generic server schema makes $schema optional", () => {
  expect(InputSchema.safeParse({ description: "input", unexpected: true }).success).toEqual(false);
  expect(
    GenericServerJSONSchema.safeParse({
      name: "org/server",
      description: "A server",
      version: "1.0.0",
    }).success,
  ).toEqual(true);
});

test("list options enforce production bounds and incremental sync rules", () => {
  expect(ListServersOptionsSchema.safeParse({ limit: 1 }).success).toEqual(true);
  expect(ListServersOptionsSchema.safeParse({ limit: 0 }).success).toEqual(false);
  expect(ListServersOptionsSchema.safeParse({ limit: 1.5 }).success).toEqual(false);
  expect(ListServersOptionsSchema.safeParse({ limit: 101 }).success).toEqual(false);
  expect(ListServersOptionsSchema.safeParse({ updatedSince: "not-a-date" }).success).toEqual(false);
  expect(
    ListServersOptionsSchema.safeParse({
      updatedSince: "2026-01-01T00:00:00Z",
      includeDeleted: false,
    }).success,
  ).toEqual(false);
});

test("signature input requires current RFC3339 timestamps, hex signatures, and eligible domains", () => {
  const timestamp = new Date().toISOString();
  expect(
    SignatureTokenExchangeInputSchema.safeParse({
      domain: "example.com",
      signed_timestamp: "abcdef12",
      timestamp,
    }).success,
  ).toEqual(true);
  expect(
    SignatureTokenExchangeInputSchema.safeParse({
      domain: "example.github.io",
      signed_timestamp: "abcdef12",
      timestamp,
    }).success,
  ).toEqual(false);
  expect(
    SignatureTokenExchangeInputSchema.safeParse({
      domain: "example.com",
      signed_timestamp: "base64+/=",
      timestamp,
    }).success,
  ).toEqual(false);
});

test("ServerResponseSchema requires response metadata and preserves server publisher metadata", () => {
  const response = {
    server: {
      name: "org/server",
      description: "A server",
      version: "1.0.0",
      _meta: {
        "io.modelcontextprotocol.registry/publisher-provided": { tool: "publisher" },
      },
    },
    _meta: {},
  };
  expect(ServerResponseSchema.safeParse(response).success).toEqual(true);
  expect(ServerResponseSchema.safeParse({ server: response.server }).success).toEqual(false);
});
