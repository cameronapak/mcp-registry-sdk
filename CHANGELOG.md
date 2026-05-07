## 0.4.0 - 2026-04-18

Targets Registry API spec `2025-12-01` and Server JSON schema `2025-12-11`.

### Breaking Changes

- **Default API version changed to `v0.1`** (stable). Previously defaulted to `v0`. Pass `"v0"` explicitly if needed.
- **`getServerByName()` removed**. Use `getServerVersion(name, "latest")` instead.
- **`ArgumentSchema` refactored to discriminated union**: `PositionalArgumentSchema` (`type: "positional"`) and `NamedArgumentSchema` (`type: "named"`). Code constructing `Argument` objects without a `type` field must add one.
- **`KeyValueInputSchema` now requires `name`**. Previously was an alias for `ArgumentSchema`. Used for env vars and transport headers.
- **`Package.identifier` and `Package.transport` now required** (were optional).
- **`deleteServerVersion()` returns `ServerResponse`** instead of `void`.
- **`ServerJSONSchema` now enforces constraints**: `name` pattern (`^[a-zA-Z0-9.-]+/[a-zA-Z0-9._-]+$`, min 3, max 200), `description` max 100, `version` max 255.
- **`ServerResponseMetaSchema`**: `official` key no longer optional when `_meta` is present.
- **Transport URL validation**: `StreamableHttpTransportSchema` and `SseTransportSchema` now validate URL pattern.

### New Features

- **`title` field** on `ServerJSONSchema` and `ServerResponseSchema` (optional, max 100 chars)
- **`placeholder` field** on `InputSchema` (display hint for UIs)
- **`statusMessage`** (max 500) and **`statusChangedAt`** on `RegistryExtensionsSchema`
- **`includeDeleted`** option on `listServers()`, `listServerVersions()`, `getServerVersion()`
- **Status update endpoints**: `admin.updateVersionStatus()` and `admin.updateAllVersionsStatus()`
- **New schemas**: `StatusUpdateRequestSchema`, `AllVersionsStatusResponseSchema`, `PositionalArgumentSchema`, `NamedArgumentSchema`, `InputSchema`, `InputWithVariablesSchema`
- **`fileSha256`** pattern validation (`^[a-f0-9]{64}$`)
- **`status` field** on `RegistryExtensionsSchema` now an enum: `"active" | "deprecated" | "deleted"`
- **`format` field** on `InputSchema` now an enum: `"string" | "number" | "boolean" | "filepath"`

### Bug Fixes

- **`updatedSince` query param** now correctly sent as `updated_since` (was sending camelCase)

### Documentation

- Clarified that the SDK tracks the released Server JSON schema, not unreleased draft changelog entries.
- Added direct links to the generic OpenAPI spec, official registry OpenAPI spec, and versioned Server JSON schema.

## 0.3.0 - 2025-12-11

Historical note: `0.4.0` supersedes the `0.3.0` migration guidance. In current versions, `MCPRegistryClient()` defaults to `v0.1`, and `getServerByName()` has been removed.

### Breaking Changes

- **Server schema version updated**: SDK now uses server.json schema version 2025-12-11
- **getServerByName() deprecated**: The `getServerByName()` method is now deprecated and will emit a console warning. Users should migrate to explicit version methods (`getServerVersion()`, `listServerVersions()`)
- **Transport types updated**: New transport schemas (`StdioTransport`, `StreamableHttpTransport`, `SseTransport`) have been added and `TransportSchema` is now a discriminated union

### New Features

- **API version support**: Client now supports both `/v0/` (development) and `/v0.1/` (stable) API versions. At the time of `0.3.0`, the constructor defaulted to `v0`; current versions default to `v0.1`.
- **New server version methods**:
  - `getServerVersion(serverName, version)` - Get a specific version
  - `listServerVersions(serverName)` - List all available versions
  - `getServerByName()` now calls `/versions/latest` endpoint internally
- **Package schema enhancements**: The `version` field in `PackageSchema` is now optional (aligns with official registry)
- **New transport types**:
  - `StdioTransportSchema` - Standard IO transport (`type: 'stdio'`)
  - `StreamableHttpTransportSchema` - HTTP transport with streaming support
  - `SseTransportSchema` - Server-Sent Events transport
- **URL template variables**: Remote transport now supports optional `variables` property for URL templating with `{curly_braces}` syntax
- **Icon schema**: New `IconSchema` for server icons with `src` (required), `mimeType`, `sizes`, and `theme` (all optional)
- **Additional schemas from official registry**:
  - `ResponseMetaSchema` - API response metadata (status, publishedAt, updatedAt, isLatest)
  - `ServerMetaSchema` - Server metadata in list responses
  - `ServerJSONSchema` - Alias for ServerDetail (input format)
  - `ServerListResponseSchema` - List operations response
  - `VersionBodySchema` - Version endpoint responses
  - `SignatureTokenExchangeInputSchema` - DNS/HTTP signature exchange
  - `OIDCTokenExchangeInputBodySchema` - Google OIDC (admin-only)
  - `GitHubTokenExchangeInputBodySchema` - GitHub auth
  - `GitHubOIDCTokenExchangeInputBodySchema` - GitHub OIDC auth
  - `MetadataSchema` - Pagination metadata
- **New admin endpoint**: `PUT /servers/{serverName}/versions/{version}` for updating server versions

### Migration Guide

The original `0.3.0` migration guide has been superseded by `0.4.0`.
For current code, use `getServerVersion(name, "latest")`; `getServerByName()` is no longer exported.
`MCPRegistryClient()` now defaults to the stable `v0.1` API.

**Update server.json $schema:**
```json
{
  "$schema": "https://raw.githubusercontent.com/modelcontextprotocol/registry/main/docs/reference/server-json/server.schema.json"
}
```

### Technical Notes

- All endpoint URLs now use URL encoding for server names and versions (`encodeURIComponent()`)
- All namespace classes (Auth, Server, Publish, Admin, Health, Ping) respect the configured API version
- TypeScript types are derived from Zod schemas for runtime validation
- Backward compatibility maintained where practical

## 0.2.0 - 2025-10-04

- Added tests for server listing functionality
- Updated RegistryExtensionsSchema and RemoteSchema to make some fields optional
- Updated package version to 0.2.0s
- `ServerResponse` and `ServerResponseSchema` are now properly typed.

## 0.1.2 - 2025-10-03

- Added re-exports for every schema constant in index.ts, so consumers can import schemas statically from the root entry.
- Rebuilt the package; the generated d.ts now includes these named schema exports and the build completed at version 0.1.2.
