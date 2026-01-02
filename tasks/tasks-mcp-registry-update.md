## Relevant Files

- `index.ts` - Main SDK client file (add API version support, new methods, updated namespaces)
- `types.ts` - Type definitions (add new schemas: Icon, transports, response schemas, update Package, Transport)
- `README.md` - Update documentation with new API version, endpoints, migration guide
- `package.json` - Update version from 0.2.0 to 0.3.0
- `tests/server_list.test.ts` - Update to test new version methods and API versioning

## Instructions for Completing Tasks

**IMPORTANT:** As you complete each task, you must check it off in this markdown file by changing `- [ ]` to `- [x]`. This helps track progress and ensures you don't skip any steps.

Example:
- `- [ ] 1.1 Read file` → `- [x] 1.1 Read file` (after completing)

Update the file after completing each sub-task, not just after completing an entire parent task.

## Tasks

- [ ] 1.0 Add API Version Support
  - [ ] 1.1 Add `apiVersion` parameter to `MCPRegistryClient` constructor with default 'v0'
  - [ ] 1.2 Store apiVersion as private property on client class
  - [ ] 1.3 Update all namespace constructors (Auth, Server, Publish, Admin, Health, Ping) to accept apiVersion
  - [ ] 1.4 Update all namespace methods to use configurable API version in URL paths
  - [ ] 1.5 Add documentation comment explaining v0 (dev) vs v0.1 (stable) difference

- [x] 2.0 Update Server Endpoint Methods
  - [x] 2.1 Update `getServerByName()` to call `/versions/latest` endpoint internally
  - [x] 2.2 Add new method `getServerVersion(serverName: string, version: string)` calling `/versions/{version}`
  - [x] 2.3 Add new method `listServerVersions(serverName: string)` calling `/versions` endpoint
  - [x] 2.4 Add deprecation warning to `getServerByName()` using `console.warn()`
  - [x] 2.5 Ensure URL encoding with `encodeURIComponent()` for all server names and versions
  - [x] 2.6 Fix test bug: changed name.length to version.length in test assertion

- [x] 3.0 Update Package Schema
   - [x] 3.1 Make `version` field optional in `PackageSchema` (remove from `required` array)
   - [x] 3.2 Update Zod schema validation to allow version to be omitted
   - [x] 3.3 Verify TypeScript type reflects optional version field

- [ ] 4.0 Update Transport Schemas
  - [ ] 4.1 Create `StdioTransportSchema` with required `type: 'stdio'`
  - [ ] 4.2 Create `StreamableHttpTransportSchema` with required `type`, `url`, optional `headers`
  - [ ] 4.3 Create `SseTransportSchema` with required `type`, `url`, optional `headers`
  - [ ] 4.4 Export new transport schemas as Zod schemas and TypeScript types
  - [ ] 4.5 Update `TransportSchema` to be discriminated union of three transport types

- [ ] 5.0 Add URL Template Variables to Remote Transport
  - [ ] 5.1 Add optional `variables` property to `RemoteSchema`
  - [ ] 5.2 Define variables as object with string keys and Argument values
  - [ ] 5.3 Add description for URL template variable substitution pattern (`{curly_braces}`)

- [x] 6.0 Add Icon Schema
  - [x] 6.1 Create `IconSchema` with required `src` field
  - [x] 6.2 Add optional `mimeType` field with enum validation (image/png, image/jpeg, image/jpg, image/svg+xml, image/webp)
  - [x] 6.3 Add optional `sizes` field with pattern validation (`^(\d+x\d+|any)$`)
  - [x] 6.4 Add optional `theme` field with enum validation ('light', 'dark')
  - [x] 6.5 Export as Zod schema and TypeScript type
  - [x] 6.6 Add to `ServerDetailSchema` as optional `icons` array

- [ ] 7.0 Add Additional Schemas from Official Registry
  - [ ] 7.1 Create `ResponseMetaSchema` for API response-level metadata (status, publishedAt, updatedAt, isLatest)
  - [ ] 7.2 Create `ServerMetaSchema` for server metadata in responses
  - [ ] 7.3 Create `ServerJSONSchema` as alias for ServerDetail (input format)
  - [ ] 7.4 Create `ServerListResponseSchema` for list operations
  - [ ] 7.5 Create `TransportSchema` as discriminated union of Stdio, StreamableHttp, SSE
  - [ ] 7.6 Create `VersionBodySchema` for version endpoint responses
  - [ ] 7.7 Create `SignatureTokenExchangeInputSchema` for DNS/HTTP signature exchange
  - [ ] 7.8 Create `OIDCTokenExchangeInputBodySchema` for Google OIDC (admin-only)
  - [ ] 7.9 Create `GitHubTokenExchangeInputBodySchema` for GitHub auth
  - [ ] 7.10 Create `GitHubOIDCTokenExchangeInputBodySchema` for GitHub OIDC auth
  - [ ] 7.11 Create `MetadataSchema` for pagination metadata
  - [ ] 7.12 Export all new schemas as Zod schemas and TypeScript types
  - [ ] 7.13 Update existing auth namespace to use new GitHub schemas

- [ ] 8.0 Add New Admin Endpoints
  - [ ] 8.1 Add `PUT /servers/{serverName}/versions/{version}` endpoint for updates
  - [ ] 8.2 Add documentation for `DELETE /servers/{serverName}/versions/{version}` (optional)
  - [ ] 8.3 Ensure these endpoints use configured API version (v0 or v0.1)

- [ ] 9.0 Update Documentation
  - [ ] 9.1 Update README to document new `apiVersion` constructor option
  - [ ] 9.2 Update all code examples to show both v0 and v0.1 usage patterns
  - [ ] 9.3 Add migration guide section for deprecated `getServerByName()` method
  - [ ] 9.4 Update `$schema` URL examples to use 2025-12-11 version
  - [ ] 9.5 Document new transport types and URL template variables feature
  - [ ] 9.6 Document new schemas (Icon, transports, response schemas)

- [ ] 10.0 Version Bump & Release
  - [ ] 10.1 Update package.json version from 0.2.0 to 0.3.0 (MAJOR version bump)
  - [ ] 10.2 Create CHANGELOG.md entry documenting breaking changes
  - [ ] 10.3 Include detailed migration notes for users
  - [ ] 10.4 Update version references in any remaining documentation

- [ ] 11.0 Testing & Validation
  - [ ] 11.1 Run existing tests in `tests/` directory to ensure no regressions
  - [ ] 11.2 Add tests for new version methods (getServerVersion, listServerVersions)
  - [ ] 11.3 Add tests for API version configuration (v0 vs v0.1)
  - [ ] 11.4 Test new transport schemas and Icon schema
  - [ ] 11.5 Verify TypeScript compilation succeeds with no errors
  - [ ] 11.6 Test that README examples execute successfully
