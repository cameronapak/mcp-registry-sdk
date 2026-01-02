# MCP Registry SDK (TypeScript)

A minimal, typed client for the official Model Context Protocol (MCP) Registry API.

Note: This README documents the current code in this repository. It targets the existing `/v0` endpoints implemented in [index.ts](index.ts:1) and types in [types.ts](types.ts:1).

## Install

- npm: `npm install mcp-registry-spec-sdk`
- pnpm: `pnpm add mcp-registry-spec-sdk`
- yarn: `yarn add mcp-registry-spec-sdk`

Requires Node.js 18+.

## Quick start

```ts
// ESM in Node 18+
import { MCPRegistryClient } from "mcp-registry-spec-sdk";

// Recommended: use v0.1 (stable) API for production
const client = new MCPRegistryClient(undefined, "v0.1");

// Optionally set a default Bearer token for publish/admin
client.setAuthToken(process.env.MCP_REGISTRY_TOKEN);

// Ping
const ping = await client.ping.ping();
// { environment: string, version: string }
console.log("ping:", ping);

// Health
const health = await client.health.getHealth();
// { status: string }
console.log("health:", health);

// List servers (with optional filters)
const list = await client.server.listServers({ search: "openai", limit: 10, updatedSince: "2024-01-01T00:00:00Z" });
console.log("servers:", list.servers.length, "next:", list.metadata.nextCursor);

// Get a server by name (latest) - deprecated, use getServerVersion instead
const server = await client.server.getServerByName("some-server-name");
console.log("server:", server.name);
```

**API Versions:**
- `v0` (default): Development version, may evolve with additive changes
- `v0.1` (recommended): Stable version, only additive backward-compatible changes

Use `v0.1` for production environments. Both versions share the same current endpoints, but `v0.1` is guaranteed to maintain backward compatibility.

## API surface

The client is namespaced by feature:
- `auth` — Token exchange helpers
- `health` — Health check
- `ping` — Connectivity check
- `server` — List/get servers (+ version endpoints)
- `publish` — Publish a server
- `admin` — Admin-only operations

### Client

```ts
import { MCPRegistryClient } from "mcp-registry-spec-sdk";

const client = new MCPRegistryClient("https://registry.modelcontextprotocol.io");
// or omit the URL to use the default base URL

// Set or clear a default token used by publish/admin
client.setAuthToken("YOUR_REGISTRY_JWT"); // omit or pass undefined to clear
```

### Ping

```ts
const response = await client.ping.ping();
// response: { environment: string; version: string }
```

### Health

```ts
const response = await client.health.getHealth();
// response: { status: string }
```

### Servers

List servers with optional pagination and filters:

```ts
const response = await client.server.listServers({
  cursor: "opaque-cursor",   // optional
  limit: 20,                 // optional
  search: "my query",        // optional
  updatedSince: "2024-01-01T00:00:00Z", // optional (ISO-8601, camelCase)
  version: "1.0.0",          // optional
});

// response.servers: ServerResponse[]
// response.metadata: { count: number, nextCursor?: string }
```

Get a single server by name (latest):

```ts
const server = await client.server.getServerByName("server-name");
// server: ServerResponse
```

List versions for a server:

```ts
const versions = await client.server.listServerVersions("server-name");
// versions: ServerResponse[]
```

Get a specific version of a server:

```ts
const v = await client.server.getServerVersion("server-name", "1.2.3");
// v: ServerResponse
```

#### Migration Note

The `getServerByName()` method is **deprecated**. Update your code to use explicit version methods:

```ts
// Old (deprecated) - implicit "latest"
const server = await client.server.getServerByName("my-server");

// New (recommended) - explicit version
const latest = await client.server.getServerVersion("my-server", "latest");
const specific = await client.server.getServerVersion("my-server", "1.0.0");
const allVersions = await client.server.listServerVersions("my-server");
```

### Publish

Publish or update a server entry. Requires a registry token (JWT). You can either:
- Set a default token once via `client.setAuthToken("...")`, or
- Pass a token per call (second argument).

```ts
import type { ServerJSON, ServerResponse } from "mcp-registry-spec-sdk";

// Minimal ServerJSON example
const serverPayload: ServerJSON = {
  name: "my-mcp-server",
  description: "My MCP server",
  version: "1.0.0",
  // optional fields: repository, websiteUrl, packages, remotes, _meta (publisher-provided)
};

// Option A: use default token previously set via client.setAuthToken
const publishedA: ServerResponse = await client.publish.publishServer(serverPayload);

// Option B: pass token per call
const publishedB: ServerResponse = await client.publish.publishServer(
  serverPayload,
  process.env.MCP_REGISTRY_TOKEN // token string without "Bearer " prefix
);
```

### Admin

Edit an existing server version (admin-only). Requires a registry token (JWT).

```ts
import type { ServerJSON, ServerResponse } from "mcp-registry-spec-sdkmcp-registry";

// Option A: use default token
const editedA: ServerResponse = await client.admin.editServerVersion(
  "server-name",
  "1.0.0",
  {
    name: "my-mcp-server",
    description: "Updated description",
    version: "1.0.0",
  } as ServerJSON,
);

// Option B: pass token per call
const editedB: ServerResponse = await client.admin.editServerVersion(
  "server-name",
  "1.0.0",
  {
    name: "my-mcp-server",
    description: "Updated again",
    version: "1.0.0",
  } as ServerJSON,
  process.env.MCP_REGISTRY_TOKEN
);
```

### Auth (token exchange)

These helpers exchange third-party tokens/signatures for a registry JWT.

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

All request/response shapes are exported, powered by Zod schemas in [types.ts](types.ts:1). Example:

```ts
import type {
  ServerJSON,
  ServerResponse,
  ServerListResponse,
  ListServersOptions,
  TokenResponse,
  ErrorModel,
  StdioTransport,
  StreamableHttpTransport,
  SseTransport,
  Icon,
} from "mcp-registry-spec-sdk";
```

### Server JSON Schema

The SDK uses version `2025-12-11` of the server.json schema. Update your `$schema` references:

```json
{
  "$schema": "https://raw.githubusercontent.com/modelcontextprotocol/registry/main/docs/reference/server-json/server.schema.json",
  "name": "my-mcp-server",
  "description": "My MCP server",
  "version": "1.0.0"
}
```

### Transport Types

Servers can use three transport types:

```ts
import type { StdioTransport, StreamableHttpTransport, SseTransport } from "mcp-registry-spec-sdk";

// Stdio transport - local process execution
const stdio: StdioTransport = { type: 'stdio' };

// Streamable HTTP transport - streaming responses
const http: StreamableHttpTransport = {
  type: 'streamable-http',
  url: 'https://api.example.com/mcp',
  headers: [
    { name: 'Authorization', value: 'Bearer {token}' }
  ]
};

// SSE transport - server-sent events
const sse: SseTransport = {
  type: 'sse',
  url: 'https://api.example.com/mcp',
  headers: [
    { name: 'Authorization', value: 'Bearer {token}' }
  ]
};
```

### URL Template Variables

Remote transports support URL template variables for multi-tenant deployments:

```ts
import type { Remote, Argument } from "mcp-registry-spec-sdk";

const remoteWithVariables: Remote = {
  type: 'sse',
  url: 'https://api.{tenant_id}.example.com/mcp',
  variables: {
    tenant_id: {
      name: 'tenant_id',
      description: 'Tenant identifier',
      isRequired: true,
      valueHint: 'your-tenant-id'
    } as Argument
  },
  headers: []
};
```

URLs use `{variable_name}` placeholders that get replaced with values from the `variables` object.

### Icon Schema

Add icons to your server definitions:

```ts
import type { Icon } from "mcp-registry-spec-sdk";

const icon: Icon = {
  src: 'https://example.com/icon.png', // HTTPS URL, max 255 chars
  mimeType: 'image/png', // optional: 'image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'
  sizes: ['32x32', '64x64'], // optional: e.g., ['32x32', '64x64'] or ['any']
  theme: 'light' // optional: 'light' or 'dark'
};
```

## Browser usage

This SDK is designed for server-side Node.js. If you attempt to run it in the browser:
- You will need a fetch polyfill.
- CORS may prevent direct calls to the MCP Registry API from the browser.
- It’s recommended to call the API from your server.

## Migrating and Changelogs

### Migrating to v0.3.0

This release adds support for API versioning and new transport types.

**Required Changes:**

1. Update your package version:
   ```bash
   npm install mcp-registry-spec-sdk@0.3.0
   ```

2. Replace `getServerByName()` with explicit version methods:
   ```ts
   // Old (deprecated)
   const server = await client.server.getServerByName("my-server");

   // New (recommended)
   const latest = await client.server.getServerVersion("my-server", "latest");
   const specific = await client.server.getServerVersion("my-server", "1.0.0");
   const allVersions = await client.server.listServerVersions("my-server");
   ```

3. Update `$schema` URLs in server.json files to 2025-12-11 version:
   ```json
   {
     "$schema": "https://raw.githubusercontent.com/modelcontextprotocol/registry/main/docs/reference/server-json/server.schema.json",
     "name": "my-mcp-server",
     "description": "My MCP server",
     "version": "1.0.0"
   }
   ```

**Optional Changes:**

1. Use v0.1 stable API in production:
   ```ts
   // Old (uses v0 by default)
   const client = new MCPRegistryClient();

   // New (recommended for production)
   const client = new MCPRegistryClient(undefined, "v0.1");
   ```

2. Use new transport types when defining servers.

3. Add icons to server definitions.

**No Action Needed:**
- All other methods remain unchanged
- Existing server.json files continue to work
- Authentication methods unchanged

### Additional Resources

The MCP Registry has evolving APIs and schema definitions. Review official changelogs:
- API Changelog: https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/api/CHANGELOG.md
- Server JSON Changelog: https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/server-json/CHANGELOG.md

Key breaking changes reflected in this SDK:
- Endpoints by serverName; versions sub-resources added
- Publisher input vs API response split: ServerJSON vs ServerResponse
- CamelCase field names (e.g., updatedSince, registryType, environmentVariables)
- Bearer authorization for publish/admin
- Ping/Health shapes updated
- v0.3.0: API versioning support, deprecated getServerByName, new transport types, Icon schema

## License

MIT © Cameron Pak - [cam@faith.tools](mailto:cam@faith.tools)
