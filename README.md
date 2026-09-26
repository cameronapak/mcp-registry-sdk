# MCP Registry SDK (TypeScript)

A minimal, typed client for the official Model Context Protocol (MCP) Registry API.

## Install

- bun: `bun add mcp-registry-spec-sdk`
- npm: `npm install mcp-registry-spec-sdk`
- pnpm: `pnpm add mcp-registry-spec-sdk`
- yarn: `yarn add mcp-registry-spec-sdk`

Requires Bun 1.3.10+ for development. Published package supports maintained Node.js releases starting with Node.js 22.

## Development

```sh
bun install
bun run test
bun run build
```

## Quick start

```ts
import { MCPRegistryClient } from "mcp-registry-spec-sdk";

// Default: v0.1 (stable) API
const client = new MCPRegistryClient();

// Optionally set a default Bearer token for publish/admin
client.setAuthToken(process.env.MCP_REGISTRY_TOKEN);

// Ping
const ping = await client.ping.ping();
console.log("ping:", ping);

// Health
const health = await client.health.getHealth();
console.log("health:", health);

// List servers (with optional filters)
const list = await client.server.listServers({
  search: "openai",
  limit: 10,
  updatedSince: "2024-01-01T00:00:00Z",
});
console.log("servers:", list.servers?.length ?? 0, "next:", list.metadata.nextCursor);

// Get a specific server version
const server = await client.server.getServerVersion("org/server-name", "latest");
console.log("server:", server.server.name);
```

**API Versions:**
- `v0.1` (default): Stable version, only additive backward-compatible changes
- `v0`: Development version, may evolve with breaking changes

```ts
// Explicit v0 if needed
const devClient = new MCPRegistryClient(undefined, "v0");
```

## API surface

The client is namespaced by feature:
- `auth` — Token exchange helpers
- `health` — Health check
- `ping` — Connectivity check
- `server` — List/get servers (+ version endpoints)
- `publish` — Publish a server
- `admin` — Admin-only edit and status operations

### Client

```ts
import { MCPRegistryClient } from "mcp-registry-spec-sdk";

const client = new MCPRegistryClient(); // default: official registry, v0.1

// Custom base URL
const custom = new MCPRegistryClient("https://my-registry.example.com");

// Set or clear a default token used by publish/admin
client.setAuthToken("YOUR_REGISTRY_JWT"); // omit or pass undefined to clear
```

### Servers

List servers with optional pagination and filters:

```ts
const response = await client.server.listServers({
  cursor: "opaque-cursor",   // optional
  limit: 20,                 // optional
  search: "my query",        // optional
  updatedSince: "2024-01-01T00:00:00Z", // optional (ISO-8601)
  version: "1.0.0",          // optional
  includeDeleted: true,      // optional — include deleted servers
});
// response.servers: ServerResponse[] | null
// response.metadata: { count: number, nextCursor?: string }
```

When `updatedSince` is present, the Registry always includes deleted records. Passing `includeDeleted: false` with `updatedSince` is invalid and the SDK rejects it before sending a request. Limits must be integers from 1 through 100.

Get a specific server version:

```ts
const latest = await client.server.getServerVersion("org/server-name", "latest");
const specific = await client.server.getServerVersion("org/server-name", "1.2.3");

// With include_deleted
const deleted = await client.server.getServerVersion("org/server-name", "1.0.0", {
  includeDeleted: true,
});
```

List all versions for a server:

```ts
const versions = await client.server.listServerVersions("org/server-name");
// Also supports { includeDeleted: true }
```

### Publish

Publish or update a server entry. Requires a registry token (JWT).

```ts
import type { ServerJSON } from "mcp-registry-spec-sdk";

const serverPayload: ServerJSON = {
  $schema: "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
  name: "org/my-server",
  description: "My MCP server",
  version: "1.0.0",
};

// Uses default token set via client.setAuthToken()
const published = await client.publish.publishServer(serverPayload);

// Or pass token per call
const published2 = await client.publish.publishServer(serverPayload, "my-jwt-token");
```

### Admin

Edit and update the status of server versions. All require a registry token. The optional generic-registry DELETE endpoint is not exposed because the official Registry does not implement it.

```ts
// Edit a server version
const edited = await client.admin.editServerVersion(
  "org/server-name", "1.0.0",
  {
    $schema: "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
    name: "org/server-name",
    description: "Updated",
    version: "1.0.0",
  },
);

// Update status of a single version
const updated = await client.admin.updateVersionStatus(
  "org/server-name", "1.0.0",
  { status: "deprecated", statusMessage: "Use v2 instead" },
);

// Update status of ALL versions
const allUpdated = await client.admin.updateAllVersionsStatus(
  "org/server-name",
  { status: "deprecated", statusMessage: "Project archived" },
);
// allUpdated: { updatedCount: number, servers: ServerResponse[] }
```

### Auth (token exchange)

Exchange third-party tokens/signatures for a registry JWT.

```ts
// GitHub OAuth access token -> Registry JWT
const jwt1 = await client.auth.exchangeGitHubOAuthAccessTokenForRegistryJWT({
  github_token: "gho_xxx",
});

// GitHub OIDC token -> Registry JWT
const jwt2 = await client.auth.exchangeGitHubOIDCTokenForRegistryJWT({
  oidc_token: "gh-oidc-xxx",
});

// Configured OIDC provider -> Registry JWT. This endpoint is deployment-dependent
// and is primarily used for official Registry administration.
const jwt3 = await client.auth.exchangeOIDCIDTokenForRegistryJWT({
  oidc_token: "oidc-xxx",
});

// HTTP signature -> Registry JWT
const jwt4 = await client.auth.exchangeHTTPSignatureForRegistryJWT({
  domain: "yourdomain.com",
  signed_timestamp: "abcdef1234567890", // hex-encoded signature
  timestamp: new Date().toISOString(),
});

// DNS signature -> Registry JWT
const jwt5 = await client.auth.exchangeDNSSignatureForRegistryJWT({
  domain: "yourdomain.com",
  signed_timestamp: "abcdef1234567890", // hex-encoded signature
  timestamp: new Date().toISOString(),
});
```

DNS and HTTP proofs support Ed25519 and ECDSA P-384 keys. The timestamp must be RFC3339 and within 15 seconds of the exchange request. IP addresses, single-label domains, and `github.io` domains are rejected.

GitHub Actions must request an OIDC token whose audience is the Registry base URL, such as `https://registry.modelcontextprotocol.io`. GitHub organization namespaces require an active organization Owner. Classic PATs need `read:org`; fine-grained PATs need organization Members read access.

## Types

All request/response shapes are exported as TypeScript types and Zod schemas.

```ts
import type {
  ServerJSON,
  ServerResponse,
  ServerListResponse,
  ListServersOptions,
  TokenResponse,
  ErrorModel,
  StatusUpdateRequest,
  AllVersionsStatusResponse,
  // Transports
  StdioTransport,
  StreamableHttpTransport,
  SseTransport,
  // Arguments (discriminated union)
  Argument,
  PositionalArgument,
  NamedArgument,
  KeyValueInput,
  Input,
  InputWithVariables,
  // Other
  Icon,
  Repository,
  Package,
} from "mcp-registry-spec-sdk";
```

### Zod Schemas

Every type has a corresponding Zod schema exported for runtime validation:

```ts
import {
  ServerJSONSchema,
  ServerResponseSchema,
  ArgumentSchema,
  StatusUpdateRequestSchema,
} from "mcp-registry-spec-sdk";

const parsed = ServerJSONSchema.safeParse(myData);
if (!parsed.success) console.error(parsed.error);
```

`ServerJSONSchema` models official Registry publish requirements. `GenericServerJSONSchema` models the portable released server.json contract, where `$schema` is optional and custom `_meta` namespaces are preserved. Response schemas use separate compatibility shapes for legacy package and repository records.

### Argument Types

Arguments use a discriminated union on the `type` field:

```ts
import type { PositionalArgument, NamedArgument, KeyValueInput } from "mcp-registry-spec-sdk";

const positional: PositionalArgument = {
  type: "positional",
  valueHint: "FILE",
  description: "Input file path",
  format: "filepath",
};

const named: NamedArgument = {
  type: "named",
  name: "--port",
  description: "Port number",
  format: "number",
  default: "3000",
};

// Environment variables and headers use KeyValueInput (requires name)
const envVar: KeyValueInput = {
  name: "API_KEY",
  description: "Your API key",
  isRequired: true,
  isSecret: true,
};
```

### Transport Types

Servers can use three transport types:

```ts
import type { StdioTransport, StreamableHttpTransport, SseTransport } from "mcp-registry-spec-sdk";

const stdio: StdioTransport = { type: "stdio" };

const http: StreamableHttpTransport = {
  type: "streamable-http",
  url: "https://api.example.com/mcp",
  headers: [{ name: "Authorization", value: "Bearer {token}" }],
};

const sse: SseTransport = {
  type: "sse",
  url: "https://api.example.com/mcp",
};
```

### URL Template Variables

Remote transports support URL template variables:

```ts
import type { Remote } from "mcp-registry-spec-sdk";

const remote: Remote = {
  type: "sse",
  url: "https://api.{tenant_id}.example.com/mcp",
  variables: {
    tenant_id: {
      description: "Tenant identifier",
      isRequired: true,
      placeholder: "your-tenant-id",
    },
  },
};
```

### Icon Schema

```ts
import type { Icon } from "mcp-registry-spec-sdk";

const icon: Icon = {
  src: "https://example.com/icon.png", // HTTPS URL, max 255 chars
  mimeType: "image/png",
  sizes: ["32x32", "64x64"],
  theme: "light",
};
```

## Browser usage

Modern browsers already provide `fetch`, so no polyfill is normally needed. Browser requests still depend on the target registry's CORS policy.

## Spec alignment

The SDK targets the current MCP Registry API spec (`2025-12-01`), the official Registry runtime API, and the latest released Server JSON schema (`2025-12-11`).

- Default client API version: `v0.1` (stable)
- Development API version: `v0`
- Server JSON schema: `https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json`
- Official publishing adds package allowlists, HTTPS and repository checks, metadata limits, and semantic validation beyond the portable schema.
- Draft-only leading transport URL templates such as `{baseUrl}/mcp` are rejected until released upstream.

## Migrating to v0.5.0

### Breaking Changes

1. Node.js 22 is now the minimum supported Node release.
2. Zod 4 replaces Zod 3.
3. Official schemas are strict and reject unknown properties instead of silently removing them.
4. `Package` is a registry-specific union. npm, PyPI, NuGet, and Cargo require a concrete version; OCI embeds its tag or digest in `identifier`; MCPB requires `fileSha256`.
5. Publish repositories require `url` and `source`. Use `ResponseRepository` for legacy API records.
6. Positional arguments require `value` or `valueHint`.
7. `ServerListResponse.servers` and `AllVersionsStatusResponse.servers` can be `null`, matching the generated official OpenAPI.
8. `ServerResponse._meta` is required, while its official metadata member is optional.
9. `admin.deleteServerVersion()` was removed because the official Registry does not implement DELETE.

### New Features

- Official package support for Cargo, Quay, and the current registry allowlists
- `GenericServerJSONSchema`, `GenericPackageSchema`, and generic metadata passthrough
- Separate response repository and package schemas for legacy records
- Request and response validation in client methods
- RFC3339, list-limit, metadata-size, template-variable, and auth-proof validation

### Bug Fixes

- Incremental sync options can no longer generate a known HTTP 400
- Server and package version ranges are rejected
- Publisher metadata inside `server._meta` is retained in response types

## Additional Resources

- [API Changelog](https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/api/CHANGELOG.md)
- [Server JSON Changelog](https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/server-json/CHANGELOG.md)
- [Generic OpenAPI Spec](https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/api/openapi.yaml)
- [Official Registry OpenAPI Spec](https://registry.modelcontextprotocol.io/openapi.yaml)
- [Server JSON Schema](https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json)

## License

MIT © Cameron Pak - [cam@faith.tools](mailto:cam@faith.tools)
