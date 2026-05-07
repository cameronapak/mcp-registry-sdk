# MCP Registry SDK (TypeScript)

A minimal, typed client for the official Model Context Protocol (MCP) Registry API.

## Install

- bun: `bun add mcp-registry-spec-sdk`
- npm: `npm install mcp-registry-spec-sdk`
- pnpm: `pnpm add mcp-registry-spec-sdk`
- yarn: `yarn add mcp-registry-spec-sdk`

Requires Bun 1.3.2+ for development. Published package supports Node.js 18+.

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
  includeDeleted: false,
});
console.log("servers:", list.servers.length, "next:", list.metadata.nextCursor);

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
- `admin` — Admin-only operations (edit, delete, status updates)

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
// response.servers: ServerResponse[]
// response.metadata: { count: number, nextCursor?: string }
```

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

Edit, delete, and update status of server versions. All require a registry token.

```ts
// Edit a server version
const edited = await client.admin.editServerVersion(
  "org/server-name", "1.0.0",
  { name: "org/server-name", description: "Updated", version: "1.0.0" },
);

// Delete a server version (optional endpoint, not on official registry)
const deleted = await client.admin.deleteServerVersion("org/server-name", "1.0.0");

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

// Generic OIDC ID token -> Registry JWT
const jwt3 = await client.auth.exchangeOIDCIDTokenForRegistryJWT({
  oidc_token: "oidc-xxx",
});

// HTTP signature -> Registry JWT
const jwt4 = await client.auth.exchangeHTTPSignatureForRegistryJWT({
  domain: "yourdomain.com",
  signed_timestamp: "base64signature",
  timestamp: new Date().toISOString(),
});

// DNS signature -> Registry JWT
const jwt5 = await client.auth.exchangeDNSSignatureForRegistryJWT({
  domain: "yourdomain.com",
  signed_timestamp: "base64signature",
  timestamp: new Date().toISOString(),
});
```

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

This SDK is designed for server-side Bun or Node.js. Browser usage requires a fetch polyfill and may hit CORS restrictions.

## Spec alignment

Version `0.4.0` targets the current MCP Registry API spec (`2025-12-01`) and the latest released Server JSON schema (`2025-12-11`).

- Default client API version: `v0.1` (stable)
- Development API version: `v0`
- Server JSON schema: `https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json`
- Draft Server JSON changes are not treated as released until they move out of the upstream draft changelog.

## Migrating to v0.4.0

### Breaking Changes

1. **Default API version changed** from `v0` to `v0.1`:
   ```ts
   // v0.3.0: defaulted to v0
   const client = new MCPRegistryClient();

   // v0.4.0: defaults to v0.1 (stable)
   const client = new MCPRegistryClient(); // now uses v0.1

   // Explicitly use v0 if needed
   const client = new MCPRegistryClient(undefined, "v0");
   ```

2. **`getServerByName()` removed** — use `getServerVersion()`:
   ```ts
   // Old
   const server = await client.server.getServerByName("org/server");

   // New
   const server = await client.server.getServerVersion("org/server", "latest");
   ```

3. **`ArgumentSchema` is now a discriminated union** with `type: "positional"` or `type: "named"`. If you were constructing `Argument` objects without a `type` field, add the appropriate type.

4. **`KeyValueInputSchema` now requires `name`**. Previously it was an alias for `ArgumentSchema`.

5. **`Package.identifier` and `Package.transport` are now required** (were optional).

6. **`deleteServerVersion()` now returns `ServerResponse`** instead of `void`.

7. **`ServerJSONSchema` now enforces** `name` pattern (`org/name`), `description` max 100 chars, `version` max 255 chars.

### New Features

- `title` field on servers (optional display name)
- `placeholder` field on inputs
- `statusMessage` and `statusChangedAt` on registry metadata
- `includeDeleted` option on list/get endpoints
- `updateVersionStatus()` and `updateAllVersionsStatus()` admin methods
- `StatusUpdateRequestSchema` and `AllVersionsStatusResponseSchema`
- Proper `PositionalArgumentSchema` and `NamedArgumentSchema`
- Transport URL pattern validation
- `fileSha256` hex pattern validation

### Bug Fixes

- `updatedSince` query param now correctly sent as `updated_since` to the API

## Additional Resources

- [API Changelog](https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/api/CHANGELOG.md)
- [Server JSON Changelog](https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/server-json/CHANGELOG.md)
- [Generic OpenAPI Spec](https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/api/openapi.yaml)
- [Official Registry OpenAPI Spec](https://registry.modelcontextprotocol.io/openapi.yaml)
- [Server JSON Schema](https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json)

## License

MIT © Cameron Pak - [cam@faith.tools](mailto:cam@faith.tools)
