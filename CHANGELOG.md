## 0.2.0 - 2025-10-04

- Added tests for server listing functionality
- Updated RegistryExtensionsSchema and RemoteSchema to make some fields optional
- Updated package version to 0.2.0s
- `ServerResponse` and `ServerResponseSchema` are now properly typed. 

## 0.1.2 - 2025-10-03

- Added re-exports for every schema constant in index.ts, so consumers can import schemas statically from the root entry.
- Rebuilt the package; the generated d.ts now includes these named schema exports and the build completed at version 0.1.2.
