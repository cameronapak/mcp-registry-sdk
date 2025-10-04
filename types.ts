/**
 * 2025-09-29 Registry alignment (latest only)
 * - server.json (publisher) uses camelCase
 * - API responses separated as ServerResponse with registry-managed _meta
 * - status removed from publisher, present under official metadata in responses
 * - arguments unified (Argument) with isRepeated/valueHint etc.
 */

import { z } from "zod";

// -------- Registry-managed metadata (API responses) --------
export const RegistryExtensionsSchema = z.object({
  serverId: z.string(),
  versionId: z.string(),
  publishedAt: z.string(),
  updatedAt: z.string().optional(),
  isLatest: z.boolean(),
  status: z.string().optional(),
});

// -------- Publisher-provided meta wrapper --------
export const ServerJSONMetaSchema = z
  .object({
    "io.modelcontextprotocol.registry/publisher-provided": z.record(
      z.string(),
      z.any(),
    ),
  })
  .partial();

// -------- API response meta wrapper (includes official) --------
export const ServerResponseMetaSchema = z
  .object({
    "io.modelcontextprotocol.registry/official": RegistryExtensionsSchema,
    "io.modelcontextprotocol.registry/publisher-provided": z
      .record(z.string(), z.any())
      .optional(),
  })
  .partial();

// -------- Unified Argument schema (runtime/package/env/etc.) --------
export const ArgumentSchema = z.object({
  // Common fields
  name: z.string().optional(),
  description: z.string().optional(),
  format: z.string().optional(),
  default: z.string().optional(),
  value: z.string().optional(),
  choices: z.array(z.string()).nullable().optional(),

  // Booleans / hints
  isRequired: z.boolean().optional(),
  isSecret: z.boolean().optional(),
  isRepeated: z.boolean().optional(),
  valueHint: z.string().optional(),

  // Optional type discriminator (e.g. "positional", "named")
  type: z.string().optional(),

  // Template variables for complex args (e.g. docker --mount)
  variables: z
    .record(
      z.string(),
      z.object({
        description: z.string().optional(),
        format: z.string().optional(),
        default: z.string().optional(),
        isRequired: z.boolean().optional(),
        valueHint: z.string().optional(),
        choices: z.array(z.string()).nullable().optional(),
      }),
    )
    .optional(),
});

// Back-compat aliases (internal use only)
export const InputSchema = ArgumentSchema;
export const KeyValueInputSchema = ArgumentSchema;

// -------- Transports / Remotes --------
export const TransportSchema = z.object({
  type: z.string(),
  url: z.string(),
  headers: z.array(ArgumentSchema).optional(),
});

export const RemoteSchema = z.object({
  transportType: z.string(),
  url: z.string(),
  headers: z.array(ArgumentSchema).optional(),
});

// -------- Repository --------
export const RepositorySchema = z.object({
  id: z.string().optional(),
  source: z.string(),
  subfolder: z.string().optional(),
  url: z.string(),
});

// -------- Package (camelCase) --------
export const PackageSchema = z.object({
  registryType: z.string(), // e.g. "npm", "docker"
  registryBaseUrl: z.string().optional(),
  identifier: z.string().optional(),
  fileSha256: z.string().optional(),

  name: z.string().optional(),
  version: z.string(),

  runtimeHint: z.string().optional(),
  runtimeArguments: z.array(ArgumentSchema).nullable().optional(),
  packageArguments: z.array(ArgumentSchema).nullable().optional(),
  environmentVariables: z.array(ArgumentSchema).nullable().optional(),

  transport: TransportSchema.optional(),
});

// -------- Server JSON (publisher input) --------
export const ServerJSONSchema = z.object({
  $schema: z.string().optional(),
  name: z.string(),
  description: z.string(),
  version: z.string(),
  repository: RepositorySchema.optional(),
  websiteUrl: z.string().optional(),

  packages: z.array(PackageSchema).nullable().optional(),
  remotes: z.array(RemoteSchema).nullable().optional(),

  // Publisher-provided meta only; official meta is registry-managed and not accepted here
  _meta: ServerJSONMetaSchema.optional(),
});

// -------- Server Response (API output) --------
export const ServerResponseSchema = z.object({
  $schema: z.string().optional(),
  name: z.string(),
  description: z.string(),
  version: z.string(),
  repository: RepositorySchema.optional(),
  websiteUrl: z.string().optional(),

  packages: z.array(PackageSchema).nullable().optional(),
  remotes: z.array(RemoteSchema).nullable().optional(),

  _meta: ServerResponseMetaSchema.optional(),
});

// -------- List / pagination --------
export const MetadataSchema = z.object({
  nextCursor: z.string().optional(),
  count: z.number(),
});

export const ServerListResponseSchema = z.object({
  servers: z.array(ServerResponseSchema),
  metadata: MetadataSchema,
});

// -------- ListServers options (camelCase) --------
export const ListServersOptionsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().optional(),
  search: z.string().optional(),
  updatedSince: z.string().optional(),
  version: z.string().optional(),
});

// -------- Auth exchange bodies / tokens (unchanged) --------
export const GitHubTokenExchangeInputBodySchema = z.object({
  github_token: z.string(),
});

export const TokenResponseSchema = z.object({
  expires_at: z.number(),
  registry_token: z.string(),
});

export const GitHubOIDCTokenExchangeInputBodySchema = z.object({
  oidc_token: z.string(),
});

export const HTTPTokenExchangeInputBodySchema = z.object({
  domain: z.string(),
  signed_timestamp: z.string(),
  timestamp: z.string(),
});

export const OIDCTokenExchangeInputBodySchema = z.object({
  oidc_token: z.string(),
});

export const DNSTokenExchangeInputBodySchema = z.object({
  domain: z.string(),
  signed_timestamp: z.string(),
  timestamp: z.string(),
});

// -------- Health / Ping --------
export const HealthBodySchema = z.object({
  status: z.string(),
});

export const PingBodySchema = z.object({
  environment: z.string(),
  version: z.string(),
});

// -------- Errors --------
export const ErrorDetailSchema = z.object({
  location: z.string().optional(),
  message: z.string(),
  value: z.any().optional(),
});

export const ErrorModelSchema = z.object({
  detail: z.string().optional(),
  errors: z.array(ErrorDetailSchema).nullable().optional(),
  instance: z.string().optional(),
  status: z.number().optional(),
  title: z.string().optional(),
  type: z.string().optional(),
});

// -------- TypeScript exports --------
export type RegistryExtensions = z.infer<typeof RegistryExtensionsSchema>;
export type ServerJSONMeta = z.infer<typeof ServerJSONMetaSchema>;
export type ServerResponseMeta = z.infer<typeof ServerResponseMetaSchema>;

export type Argument = z.infer<typeof ArgumentSchema>;
export type Input = z.infer<typeof InputSchema>;
export type KeyValueInput = z.infer<typeof KeyValueInputSchema>;

export type Transport = z.infer<typeof TransportSchema>;
export type Remote = z.infer<typeof RemoteSchema>;
export type Repository = z.infer<typeof RepositorySchema>;
export type Package = z.infer<typeof PackageSchema>;

export type ServerJSON = z.infer<typeof ServerJSONSchema>;
export type ServerResponse = z.infer<typeof ServerResponseSchema>;

export type Metadata = z.infer<typeof MetadataSchema>;
export type ServerListResponse = z.infer<typeof ServerListResponseSchema>;
export type ListServersOptions = z.infer<typeof ListServersOptionsSchema>;

export type GitHubTokenExchangeInputBody = z.infer<
  typeof GitHubTokenExchangeInputBodySchema
>;
export type TokenResponse = z.infer<typeof TokenResponseSchema>;
export type GitHubOIDCTokenExchangeInputBody = z.infer<
  typeof GitHubOIDCTokenExchangeInputBodySchema
>;
export type HTTPTokenExchangeInputBody = z.infer<
  typeof HTTPTokenExchangeInputBodySchema
>;
export type OIDCTokenExchangeInputBody = z.infer<
  typeof OIDCTokenExchangeInputBodySchema
>;
export type DNSTokenExchangeInputBody = z.infer<
  typeof DNSTokenExchangeInputBodySchema
>;

export type HealthBody = z.infer<typeof HealthBodySchema>;
export type PingBody = z.infer<typeof PingBodySchema>;

export type ErrorDetail = z.infer<typeof ErrorDetailSchema>;
export type ErrorModel = z.infer<typeof ErrorModelSchema>;