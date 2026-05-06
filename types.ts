/**
 * MCP Registry SDK — Zod schemas aligned to upstream spec 2025-12-01
 * https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/api/openapi.yaml
 */

import { z } from "zod";

// -------- Registry-managed metadata (API responses) --------
export const RegistryExtensionsSchema = z.object({
  /** @deprecated use server name instead */
  serverId: z.string().optional(),
  /** @deprecated use server version instead */
  versionId: z.string().optional(),
  publishedAt: z.string(),
  updatedAt: z.string().optional(),
  isLatest: z.boolean(),
  status: z.enum(["active", "deprecated", "deleted"]).optional(),
  statusMessage: z.string().max(500).optional(),
  statusChangedAt: z.string().optional(),
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
export const ServerResponseMetaSchema = z.object({
  "io.modelcontextprotocol.registry/official": RegistryExtensionsSchema,
  "io.modelcontextprotocol.registry/publisher-provided": z
    .record(z.string(), z.any())
    .optional(),
});

// -------- Input (base for all argument types) --------
export const InputSchema = z.object({
  description: z.string().optional(),
  isRequired: z.boolean().optional(),
  format: z.enum(["string", "number", "boolean", "filepath"]).optional(),
  value: z.string().optional(),
  isSecret: z.boolean().optional(),
  default: z.string().optional(),
  placeholder: z.string().optional(),
  choices: z.array(z.string()).nullable().optional(),
});

// -------- InputWithVariables (Input + template variables) --------
export const InputWithVariablesSchema = InputSchema.extend({
  variables: z.record(z.string(), InputSchema).optional(),
});

// -------- Argument subtypes (discriminated union) --------
export const PositionalArgumentSchema = InputWithVariablesSchema.extend({
  type: z.literal("positional"),
  valueHint: z.string().optional(),
  isRepeated: z.boolean().optional(),
});

export const NamedArgumentSchema = InputWithVariablesSchema.extend({
  type: z.literal("named"),
  name: z.string(),
  isRepeated: z.boolean().optional(),
});

export const ArgumentSchema = z.discriminatedUnion("type", [
  PositionalArgumentSchema,
  NamedArgumentSchema,
]);

// -------- KeyValueInput (env vars, headers — requires name) --------
export const KeyValueInputSchema = InputWithVariablesSchema.extend({
  name: z.string(),
});

// -------- Icon --------
export const IconSchema = z.object({
  src: z.string().url().max(255),
  mimeType: z
    .enum([
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/svg+xml",
      "image/webp",
    ])
    .optional(),
  sizes: z
    .array(z.string().regex(/^(\d+x\d+|any)$/))
    .optional(),
  theme: z.enum(["light", "dark"]).optional(),
});

// -------- Transports --------
const transportUrlPattern =
  /^(https?:\/\/[^\s]+|\{[a-zA-Z_][a-zA-Z0-9_]*\}[^\s]*)$/;

export const StdioTransportSchema = z.object({
  type: z.literal("stdio"),
});

export const StreamableHttpTransportSchema = z.object({
  type: z.literal("streamable-http"),
  url: z.string().regex(transportUrlPattern),
  headers: z.array(KeyValueInputSchema).optional(),
});

export const SseTransportSchema = z.object({
  type: z.literal("sse"),
  url: z.string().regex(transportUrlPattern),
  headers: z.array(KeyValueInputSchema).optional(),
});

export const TransportSchema = z.discriminatedUnion("type", [
  StdioTransportSchema,
  StreamableHttpTransportSchema,
  SseTransportSchema,
]);

/**
 * Remote transport with optional URL template variables.
 * URLs can use {variable_name} placeholders replaced from the variables object.
 */
export const RemoteSchema = z.discriminatedUnion("type", [
  StreamableHttpTransportSchema.extend({
    variables: z.record(z.string(), InputSchema).optional(),
  }),
  SseTransportSchema.extend({
    variables: z.record(z.string(), InputSchema).optional(),
  }),
]);

// -------- Repository --------
// Permissive for parsing API responses (legacy servers may omit url/source).
// The API enforces url+source as required on publish.
export const RepositorySchema = z.object({
  url: z.string().url().optional(),
  source: z.string().optional(),
  id: z.string().optional(),
  subfolder: z.string().optional(),
});

// -------- Package --------
export const PackageSchema = z.object({
  registryType: z.string(),
  identifier: z.string(),
  transport: TransportSchema,

  registryBaseUrl: z.string().url().optional(),
  version: z.string().max(255).optional(),
  fileSha256: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),

  name: z.string().optional(),
  runtimeHint: z.string().optional(),
  runtimeArguments: z.array(ArgumentSchema).nullable().optional(),
  packageArguments: z.array(ArgumentSchema).nullable().optional(),
  environmentVariables: z.array(KeyValueInputSchema).nullable().optional(),
});

// -------- Server JSON (publisher input) --------
export const ServerJSONSchema = z.object({
  $schema: z.string().optional(),
  name: z
    .string()
    .min(3)
    .max(200)
    .regex(/^[a-zA-Z0-9.-]+\/[a-zA-Z0-9._-]+$/),
  title: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(100),
  version: z.string().max(255),
  repository: RepositorySchema.optional(),
  websiteUrl: z.string().url().optional(),
  icons: z.array(IconSchema).optional(),

  packages: z.array(PackageSchema).nullable().optional(),
  remotes: z.array(RemoteSchema).nullable().optional(),

  _meta: ServerJSONMetaSchema.optional(),
});

// -------- Server Response (API output) --------
export const ServerResponseSchema = z.object({
  server: z.object({
    $schema: z.string().optional(),
    name: z.string(),
    title: z.string().optional(),
    description: z.string(),
    version: z.string(),
    repository: RepositorySchema.optional(),
    websiteUrl: z.string().url().optional(),
    icons: z.array(IconSchema).optional(),
    packages: z.array(PackageSchema).nullable().optional(),
    remotes: z.array(RemoteSchema).nullable().optional(),
  }),

  _meta: ServerResponseMetaSchema.optional(),
});

// -------- List / pagination --------
export const MetadataSchema = z.object({
  nextCursor: z.string().nullable().optional(),
  count: z.number(),
});

export const ServerListResponseSchema = z.object({
  servers: z.array(ServerResponseSchema),
  metadata: MetadataSchema,
});

// -------- ListServers options --------
export const ListServersOptionsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().optional(),
  search: z.string().optional(),
  updatedSince: z.string().optional(),
  version: z.string().optional(),
  includeDeleted: z.boolean().optional(),
});

// -------- Status update --------
export const StatusUpdateRequestSchema = z.object({
  status: z.enum(["active", "deprecated", "deleted"]),
  statusMessage: z.string().max(500).optional(),
});

export const AllVersionsStatusResponseSchema = z.object({
  updatedCount: z.number(),
  servers: z.array(ServerResponseSchema),
});

// -------- Auth exchange bodies / tokens --------
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

export const SignatureTokenExchangeInputSchema = z.object({
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

export const VersionBodySchema = z.object({
  version: z.string(),
  git_commit: z.string(),
  build_time: z.string(),
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

// -------- TypeScript type exports --------
export type RegistryExtensions = z.infer<typeof RegistryExtensionsSchema>;
export type ServerJSONMeta = z.infer<typeof ServerJSONMetaSchema>;
export type ServerResponseMeta = z.infer<typeof ServerResponseMetaSchema>;

export type Input = z.infer<typeof InputSchema>;
export type InputWithVariables = z.infer<typeof InputWithVariablesSchema>;
export type PositionalArgument = z.infer<typeof PositionalArgumentSchema>;
export type NamedArgument = z.infer<typeof NamedArgumentSchema>;
export type Argument = z.infer<typeof ArgumentSchema>;
export type KeyValueInput = z.infer<typeof KeyValueInputSchema>;

export type StdioTransport = z.infer<typeof StdioTransportSchema>;
export type StreamableHttpTransport = z.infer<
  typeof StreamableHttpTransportSchema
>;
export type SseTransport = z.infer<typeof SseTransportSchema>;
export type Transport = z.infer<typeof TransportSchema>;
export type Remote = z.infer<typeof RemoteSchema>;
export type Repository = z.infer<typeof RepositorySchema>;
export type Package = z.infer<typeof PackageSchema>;

export type ServerJSON = z.infer<typeof ServerJSONSchema>;
export type ServerResponse = z.infer<typeof ServerResponseSchema>;

export type Icon = z.infer<typeof IconSchema>;

export type Metadata = z.infer<typeof MetadataSchema>;
export type ServerListResponse = z.infer<typeof ServerListResponseSchema>;
export type ListServersOptions = z.infer<typeof ListServersOptionsSchema>;

export type StatusUpdateRequest = z.infer<typeof StatusUpdateRequestSchema>;
export type AllVersionsStatusResponse = z.infer<
  typeof AllVersionsStatusResponseSchema
>;

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
export type SignatureTokenExchangeInput = z.infer<
  typeof SignatureTokenExchangeInputSchema
>;

export type HealthBody = z.infer<typeof HealthBodySchema>;
export type PingBody = z.infer<typeof PingBodySchema>;
export type VersionBody = z.infer<typeof VersionBodySchema>;

export type ErrorDetail = z.infer<typeof ErrorDetailSchema>;
export type ErrorModel = z.infer<typeof ErrorModelSchema>;
