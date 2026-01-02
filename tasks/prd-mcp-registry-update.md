# PRD: MCP Registry SDK v0.3.0 Update

## Introduction/Overview

The MCP registry specification has evolved significantly since the last SDK release (v0.2.0). This update brings the SDK in line with the latest API specification as of December 2025, including support for the new stable v0.1 API version, updated server.json schema (2025-12-11), and several breaking changes introduced by the registry.

**Goal**: Update the SDK to be fully compatible with the latest MCP registry specification while maintaining backward compatibility where practical, ensuring users have access to all new features and endpoints.

## Goals

1. Align SDK types and methods with the official MCP registry API specification
2. Support both the stable v0.1 API and the development v0 API
3. Update server.json schema support to version 2025-12-11
4. Maintain backward compatibility where possible
5. Ensure all existing tests pass after changes

## User Stories

### As a SDK user consuming the registry
I want to use the stable `/v0.1/` API endpoints so I can rely on consistent behavior in production.

### As a SDK user with existing code
I want my existing `getServerByName()` calls to continue working (with deprecation warning) so I don't have to immediately refactor my code.

### As a SDK user publishing MCP servers
I want to be able to specify optional `version` field for OCI and MCPB packages, as the new schema allows.

### As a SDK user working with remote servers
I want to use URL template variables in remote transport definitions so I can support multi-tenant deployments.

## Functional Requirements

### 1. API Version Support
1.1 The client MUST support both `/v0/` (development) and `/v0.1/` (stable) API versions
1.2 The client MUST default to `/v0/` for backward compatibility
1.3 The client constructor MUST accept an optional `apiVersion` parameter ('v0' | 'v0.1')
1.4 All namespace classes (Auth, Server, Publish, Admin, Health, Ping) MUST use the configured API version

### 2. Server Endpoint Updates
2.1 Update `getServerByName()` to call `/versions/latest` endpoint internally
2.2 Add a new method `getServerVersion(serverName: string, version: string)` that calls `/versions/{version}` endpoint
2.3 Add a new method `listServerVersions(serverName: string)` that calls `/versions` endpoint
2.4 Add deprecation warning to `getServerByName()` indicating users should use explicit version methods
2.5 All endpoint URLs MUST use URL encoding for server names and versions

### 3. Package Schema Updates
3.1 The `version` field in `PackageSchema` MUST be made optional (not required)
3.2 The `Package` type MUST reflect that version is optional
3.3 Update Zod schema to allow version to be omitted

### 4. Transport Schema Enhancements
4.1 Add `variables` property to `RemoteSchema` (object with string keys and Argument values)
4.2 The `variables` property MUST be optional
4.3 Add description for URL template variable substitution pattern (`{curly_braces}`)

### 5. New Transport Types
5.1 Create `StdioTransportSchema` with required `type: 'stdio'`
5.2 Create `StreamableHttpTransportSchema` with required `type` and `url`, optional `headers`
5.3 Create `SseTransportSchema` with required `type` and `url`, optional `headers`
5.4 Export these as new Zod schemas and TypeScript types
5.5 Update `TransportSchema` to be a discriminated union of the three transport types

### 6. Icon Schema
6.1 ✅ Create `IconSchema` with required `src` field, optional `mimeType`, `sizes`, `theme`
6.2 ✅ Add validation for `mimeType` to only allow specific values (image/png, image/jpeg, image/jpg, image/svg+xml, image/webp)
6.3 ✅ Export as Zod schema and TypeScript type
6.4 ✅ Add to `ServerDetailSchema` as optional `icons` array

### 7. Additional Schemas from Official Registry
7.1 Create `ResponseMetaSchema` for API response-level metadata
7.2 Create `ServerMetaSchema` for server metadata in list responses
7.3 Create `ServerJSONSchema` for ServerDetail alias (input format)
7.4 Create `ServerListResponseSchema` for list operations
7.5 Create `TransportSchema` as discriminated union of Stdio, StreamableHttp, SSE
7.6 Create `VersionBodySchema` for version endpoint responses
7.7 Create `SignatureTokenExchangeInputSchema` for auth (DNS/HTTP signature exchange)
7.8 Create `OIDCTokenExchangeInputBodySchema` for Google OIDC (admin-only)
7.9 Create `GitHubTokenExchangeInputBodySchema` for GitHub auth
7.10 Create `GitHubOIDCTokenExchangeInputBodySchema` for GitHub OIDC auth
7.11 Create `MetadataSchema` for pagination metadata
7.12 Export all new schemas as Zod schemas and TypeScript types

### 7. New Endpoints
7.1 Add `PUT /servers/{serverName}/versions/{version}` endpoint in Admin namespace for updates
7.2 Add `DELETE /servers/{serverName}/versions/{version}` endpoint documentation (optional)
7.3 Ensure these endpoints use the configured API version (v0 or v0.1)

### 8. Documentation Updates
8.1 Update README to document the new `apiVersion` constructor option
8.2 Update all code examples to show both v0 and v0.1 usage
8.3 Add migration guide section for deprecated `getServerByName()` method
8.4 Update `$schema` examples to use 2025-12-11 version URL
8.5 Document the new transport types and Icon schema
8.6 Document URL template variables feature for remote servers

### 9. Version Bump
9.1 Update package.json version from 0.2.0 to 0.3.0 (MAJOR version bump)
9.2 Create CHANGELOG.md entry documenting breaking changes
9.3 Include migration notes for users

## Non-Goals (Out of Scope)

1. Do NOT add support for custom authentication mechanisms beyond existing token methods
2. Do NOT add new features not present in the official registry API
3. Do NOT remove `/v0/` support - keep both versions available
4. Do NOT add database or caching layers
5. Do NOT change the SDK's architecture or naming conventions

## Design Considerations

### Backward Compatibility
- Keep existing method signatures unchanged
- Use `console.warn()` for deprecation notices
- Default to `/v0/` to avoid breaking existing consumers
- Make new methods additive rather than replacements

### Type Safety
- All new schemas must use Zod for runtime validation
- Export types derived from Zod schemas
- Keep types as discriminated unions where appropriate

### Code Organization
- Place new schemas in types.ts alongside existing ones
- Keep namespace organization as is (Auth, Server, Publish, Admin, etc.)
- Don't split files - keep everything in existing structure

## Technical Considerations

### Dependencies
- No new dependencies required
- Zod version ^3.23.8 is sufficient

### Breaking Changes
This release includes several breaking changes:
1. Schema version update (server.json format changes)
2. Deprecation of `getServerByName()` implicit "latest" behavior
3. New transport types may affect consumers who extend them

### URL Encoding
- Must use `encodeURIComponent()` for all server names and versions in URLs
- Follow RFC 3986 for path parameter encoding

### Error Handling
- Existing `RegistryError` class continues to be used
- Add specific error messages for 404 on version endpoints
- Maintain existing error parsing logic

## Success Metrics

1. All existing tests in `tests/` directory pass without modification
2. TypeScript compilation succeeds with no errors
3. README examples using v0.1 endpoints execute successfully
4. Schema validation accepts both old and new server.json formats
5. Published package installs and imports correctly

## Additional Research Findings

### Official Registry-Specific Features
- **Auth Extensions**: Official registry has additional auth endpoints (DNS, HTTP, GitHub OIDC, Google OIDC for admins)
- **Metrics Endpoint**: GET `/metrics` for Prometheus-compatible metrics
- **Package Validation**: Official registry enforces strict validation including registry URL allowlist, package ownership verification
- **_meta Restrictions**: Only `io.modelcontextprotocol.registry/publisher-provided` metadata is preserved (4KB limit), other keys dropped
- **Restricted Registry Base URLs**: Only specific URLs allowed (NPM, PyPI, NuGet, Docker Hub, GHCR, *.pkg.dev, *.azurecr.io, mcr.microsoft.com, GitHub/GitLab releases)

### Live Registry Issues Discovered
- **Repository fields may be optional**: Some servers in the registry don't have `repository.source` and `repository.url` fields, which are currently required in RepositorySchema
- **Package version field is optional**: Confirmed via live registry data that `package.version` should be optional

### Schema Structure Details
The official schema has complete type definitions for:
- **Transport types**: `StdioTransport` (`type: 'stdio'`), `StreamableHttpTransport` (with `url` + optional `headers`), `SseTransport` (with `url` + optional `headers`)
- **Argument types**: `PositionalArgument` (with `valueHint`, `type: 'positional'`), `NamedArgument` (with `name`, `type: 'named'`), `KeyValueInput` (environment variable or header)
- **Remote transport**: Extends HTTP/SSE with optional `variables` object for URL templating
- **Icon schema**: Required `src` (HTTPS URL, max 255 chars), optional `mimeType` (enum), `sizes` (WxH or 'any'), optional `theme` ('light' | 'dark')

### API Version Behavior
- **v0**: Development version, continues to evolve with additive changes
- **v0.1**: Stable version, only additive backward-compatible changes
- Both versions currently share identical behavior, but v0.1 recommended for production

## Open Questions

### For SDK Users on v0.2.0

**Required Changes:**
1. Update to v0.3.0: `npm install mcp-registry-spec-sdk@0.3.0`
2. Replace `getServerByName()` with explicit version methods:
   ```ts
   // Old (deprecated)
   const server = await client.server.getServerByName("my-server");

   // New
   const latest = await client.server.getServerVersion("my-server", "latest");
   const specific = await client.server.getServerVersion("my-server", "1.0.0");
   ```
3. Update `$schema` URLs in your server.json files to 2025-12-11 version

**Optional Changes:**
1. Use v0.1 stable API in production:
   ```ts
   const client = new MCPRegistryClient("https://registry.modelcontextprotocol.io", "v0.1");
   ```
2. Use new transport types when defining servers
3. Add icons to server definitions

**No Action Needed:**
- All other methods remain unchanged
- Existing server.json files continue to work
- Authentication methods unchanged

## Official Resources & References

### Documentation
- **Official Registry API Docs**: https://registry.modelcontextprotocol.io/docs
- **Official Registry OpenAPI Spec**: https://registry.modelcontextprotocol.io/openapi.yaml
- **Generic Registry API Spec**: https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/api/generic-registry-api.md
- **Official Registry API**: https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/api/official-registry-api.md
- **Server JSON Format**: https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/server-json/generic-server-json.md
- **Official Registry Requirements**: https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/server-json/official-registry-requirements.md
- **Publishing Guide**: https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/quickstart.mdx
- **Publishing Commands**: https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/cli/commands.md

### Schemas
- **Latest Server Schema (2025-12-11)**: https://raw.githubusercontent.com/modelcontextprotocol/registry/main/docs/reference/server-json/server.schema.json
- **Server JSON Changelog**: https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/server-json/CHANGELOG.md
- **API Changelog**: https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/api/CHANGELOG.md

### GitHub Repository
- **Main Registry Repo**: https://github.com/modelcontextprotocol/registry
- **Issues Tracker**: https://github.com/modelcontextprotocol/registry/issues
- **Discussions**: https://github.com/modelcontextprotocol/registry/discussions

### Live Resources
- **Registry Live Status**: https://registry.modelcontextprotocol.io
- **Registry Tools**: https://modelcontextprotocol.info/tools/registry/
- **MCP Documentation**: https://modelcontextprotocol.io/

### SDK Repository
- **This SDK**: https://github.com/cameronpak/mcp-registry-sdk
- **Package on NPM**: https://www.npmjs.com/package/mcp-registry-spec-sdk
