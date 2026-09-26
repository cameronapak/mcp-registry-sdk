/**
 * MCP Registry SDK schemas for the official Registry API and the released
 * 2025-12-11 generic server.json contract.
 *
 * https://registry.modelcontextprotocol.io/openapi.yaml
 * https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json
 */

import { z } from "zod";

const RFC3339_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const HEX_PATTERN = /^[a-fA-F0-9]+$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const SERVER_NAME_PATTERN =
  /^[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?\/[a-zA-Z0-9](?:[a-zA-Z0-9._-]*[a-zA-Z0-9])?$/;
const RELEASED_TRANSPORT_URL_PATTERN = /^https?:\/\/[^\s]+$/;
const DOMAIN_PATTERN =
  /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/;

const comparatorRangePattern =
  /^\s*(?:\^|~|>=|<=|>|<|=)\s*v?\d+(?:\.\d+){0,3}(?:-[0-9A-Za-z.-]+)?\s*$/;
const hyphenRangePattern =
  /^\s*v?\d+(?:\.\d+){0,3}(?:-[0-9A-Za-z.-]+)?\s-\s*v?\d+(?:\.\d+){0,3}(?:-[0-9A-Za-z.-]+)?\s*$/;
const orRangePattern =
  /^\s*(?:v?\d+(?:\.\d+){0,3}(?:-[0-9A-Za-z.-]+)?\s*)(?:\|\|\s*v?\d+(?:\.\d+){0,3}(?:-[0-9A-Za-z.-]+)?\s*)+$/;
const dottedWildcardPattern =
  /^\s*(?:v?\d+|x|X|\*)(?:\.(?:\d+|x|X|\*)){1,2}(?:-[0-9A-Za-z.-]+)?\s*$/;

function looksLikeVersionRange(version: string): boolean {
  return (
    comparatorRangePattern.test(version) ||
    hyphenRangePattern.test(version) ||
    orRangePattern.test(version) ||
    (dottedWildcardPattern.test(version) && /[xX*]/.test(version))
  );
}

const SpecificVersionSchema = z
  .string()
  .min(1)
  .max(255)
  .refine((version) => version !== "latest", {
    message: "Version must be specific and cannot be 'latest'",
  })
  .refine((version) => !looksLikeVersionRange(version), {
    message: "Version ranges are not supported",
  });

const RFC3339Schema = z
  .string()
  .regex(RFC3339_PATTERN, "Expected RFC3339 timestamp")
  .refine((value) => !Number.isNaN(Date.parse(value)), "Expected a valid timestamp");

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function templateVariables(value: string): string[] {
  return [...value.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]!);
}

function addUndefinedTemplateIssues(
  value: string,
  available: Set<string>,
  ctx: z.RefinementCtx,
): void {
  for (const variable of templateVariables(value)) {
    if (!available.has(variable)) {
      ctx.addIssue({
        code: "custom",
        path: ["transport", "url"],
        message: `Transport URL references undefined variable '${variable}'`,
      });
    }
  }
}

// -------- Registry-managed metadata --------
export const RegistryExtensionsSchema = z.strictObject({
  publishedAt: RFC3339Schema,
  updatedAt: RFC3339Schema.optional(),
  isLatest: z.boolean(),
  status: z.enum(["active", "deprecated", "deleted"]),
  statusMessage: z.string().max(500).optional(),
  statusChangedAt: RFC3339Schema,
});

const PublisherProvidedSchema = z.record(z.string(), z.json());

export const ServerJSONMetaSchema = z
  .strictObject({
    "io.modelcontextprotocol.registry/publisher-provided": PublisherProvidedSchema.optional(),
  })
  .superRefine((meta, ctx) => {
    const value = meta["io.modelcontextprotocol.registry/publisher-provided"];
    if (value === undefined) return;

    const size = new TextEncoder().encode(JSON.stringify(value)).byteLength;
    if (size > 4096) {
      ctx.addIssue({
        code: "custom",
        path: ["io.modelcontextprotocol.registry/publisher-provided"],
        message: `Publisher-provided metadata exceeds 4096 bytes (${size} bytes)`,
      });
    }
  });

/** Generic registries may preserve additional reverse-DNS extension keys. */
export const GenericServerJSONMetaSchema = z
  .object({
    "io.modelcontextprotocol.registry/publisher-provided": PublisherProvidedSchema.optional(),
  })
  .passthrough();

export const ServerResponseMetaSchema = z.strictObject({
  "io.modelcontextprotocol.registry/official": RegistryExtensionsSchema.optional(),
});

// -------- Inputs and arguments --------
export const InputSchema = z.strictObject({
  description: z.string().optional(),
  isRequired: z.boolean().optional(),
  format: z.enum(["string", "number", "boolean", "filepath"]).optional(),
  value: z.string().optional(),
  isSecret: z.boolean().optional(),
  default: z.string().optional(),
  placeholder: z.string().optional(),
  choices: z.array(z.string()).nullable().optional(),
});

export const InputWithVariablesSchema = InputSchema.extend({
  variables: z.record(z.string(), InputSchema).optional(),
});

export const PositionalArgumentSchema = InputWithVariablesSchema.extend({
  type: z.literal("positional"),
  valueHint: z.string().optional(),
  isRepeated: z.boolean().optional(),
}).refine((argument) => argument.value !== undefined || argument.valueHint !== undefined, {
  message: "A positional argument requires value or valueHint",
});

export const NamedArgumentSchema = InputWithVariablesSchema.extend({
  type: z.literal("named"),
  name: z.string().min(1).refine((name) => !/[<> $]/.test(name), {
    message: "Named argument names cannot contain spaces, <, >, or $",
  }),
  isRepeated: z.boolean().optional(),
}).superRefine((argument, ctx) => {
  for (const field of ["value", "default"] as const) {
    if (argument[field]?.startsWith(argument.name)) {
      ctx.addIssue({
        code: "custom",
        path: [field],
        message: `${field} cannot start with the argument name`,
      });
    }
  }
});

export const ArgumentSchema = z.union([
  PositionalArgumentSchema,
  NamedArgumentSchema,
]);

export const KeyValueInputSchema = InputWithVariablesSchema.extend({
  name: z.string().min(1),
});

// -------- Icons --------
export const IconSchema = z.strictObject({
  src: z.string().url().max(255).refine(isHttpsUrl, "Icon src must use HTTPS"),
  mimeType: z
    .enum([
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/svg+xml",
      "image/webp",
    ])
    .optional(),
  sizes: z.array(z.string().regex(/^(\d+x\d+|any)$/)).nullable().optional(),
  theme: z.enum(["light", "dark"]).optional(),
});

// -------- Transports --------
export const StdioTransportSchema = z.strictObject({
  type: z.literal("stdio"),
});

export const StreamableHttpTransportSchema = z.strictObject({
  type: z.literal("streamable-http"),
  url: z.string().regex(RELEASED_TRANSPORT_URL_PATTERN),
  headers: z.array(KeyValueInputSchema).nullable().optional(),
});

export const SseTransportSchema = z.strictObject({
  type: z.literal("sse"),
  url: z.string().regex(RELEASED_TRANSPORT_URL_PATTERN),
  headers: z.array(KeyValueInputSchema).nullable().optional(),
});

export const TransportSchema = z.union([
  StdioTransportSchema,
  StreamableHttpTransportSchema,
  SseTransportSchema,
]);

const RemoteHttpSchema = StreamableHttpTransportSchema.extend({
  variables: z.record(z.string(), InputSchema).optional(),
}).superRefine(validateRemoteTransport);

const RemoteSseSchema = SseTransportSchema.extend({
  variables: z.record(z.string(), InputSchema).optional(),
}).superRefine(validateRemoteTransport);

function validateRemoteTransport(
  remote: {
    url: string;
    variables?: Record<string, unknown>;
  },
  ctx: z.RefinementCtx,
): void {
  if (!isHttpsUrl(remote.url)) {
    ctx.addIssue({ code: "custom", path: ["url"], message: "Remote URL must use HTTPS" });
    return;
  }

  const hostname = new URL(remote.url).hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".localhost")) {
    ctx.addIssue({ code: "custom", path: ["url"], message: "Remote URL cannot use localhost" });
  }

  const available = new Set(Object.keys(remote.variables ?? {}));
  for (const variable of templateVariables(remote.url)) {
    if (!available.has(variable)) {
      ctx.addIssue({
        code: "custom",
        path: ["url"],
        message: `Remote URL references undefined variable '${variable}'`,
      });
    }
  }
}

export const RemoteSchema = z.union([RemoteHttpSchema, RemoteSseSchema]);

// -------- Repositories --------
const repositoryShape = {
  url: z.string().url(),
  source: z.enum(["github", "gitlab"]),
  id: z.string().optional(),
  subfolder: z
    .string()
    .regex(/^[a-zA-Z0-9\-_./]+$/)
    .refine(
      (path) =>
        !path.startsWith("/") &&
        !path.endsWith("/") &&
        path.split("/").every((segment) => segment !== "" && segment !== "." && segment !== ".."),
      "Repository subfolder must be a clean relative path",
    )
    .optional(),
};

export const RepositorySchema = z.strictObject(repositoryShape).superRefine((repository, ctx) => {
  const expectedHost = repository.source === "github" ? "github.com" : "gitlab.com";
  let url: URL;
  try {
    url = new URL(repository.url);
  } catch {
    return;
  }
  if (
    ![expectedHost, `www.${expectedHost}`].includes(url.hostname) ||
    !/^\/[\w.-]+\/[\w.-]+\/?$/.test(url.pathname)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["url"],
      message: `Repository URL must identify a ${repository.source} repository`,
    });
  }
});

export const ResponseRepositorySchema = z.strictObject({
  url: z.string().url().optional(),
  source: z.string().optional(),
  id: z.string().optional(),
  subfolder: z.string().optional(),
});

export const GenericRepositorySchema = z.strictObject({
  url: z.string().url(),
  source: z.string(),
  id: z.string().optional(),
  subfolder: z.string().optional(),
});

// -------- Packages --------
const packageCommonShape = {
  identifier: z.string().min(1).refine((identifier) => !identifier.includes(" "), {
    message: "Package identifier cannot contain spaces",
  }),
  transport: TransportSchema,
  runtimeHint: z.string().optional(),
  runtimeArguments: z.array(ArgumentSchema).nullable().optional(),
  packageArguments: z.array(ArgumentSchema).nullable().optional(),
  environmentVariables: z.array(KeyValueInputSchema).nullable().optional(),
};

const registryPackageUrls = {
  npm: "https://registry.npmjs.org",
  pypi: "https://pypi.org",
  nuget: "https://api.nuget.org/v3/index.json",
  cargo: "https://crates.io",
} as const;

function registryPackageSchema<T extends keyof typeof registryPackageUrls>(registryType: T) {
  return z.strictObject({
    ...packageCommonShape,
    registryType: z.literal(registryType),
    registryBaseUrl: z.literal(registryPackageUrls[registryType]).optional(),
    version: SpecificVersionSchema,
  });
}

const OciPackageSchema = z
  .strictObject({
    ...packageCommonShape,
    registryType: z.literal("oci"),
  })
  .refine((pkg) => {
    const parts = pkg.identifier.split("/");
    const first = parts[0]!;
    const registry = parts.length > 1 && (first.includes(".") || first.includes(":")) ? first : "docker.io";
    const allowed =
      ["docker.io", "registry-1.docker.io", "index.docker.io", "ghcr.io", "quay.io", "mcr.microsoft.com"].includes(registry) ||
      registry.endsWith(".pkg.dev") ||
      registry.endsWith(".azurecr.io");
    const finalSegment = pkg.identifier.split("/").at(-1)!;
    return allowed && (finalSegment.includes(":") || pkg.identifier.includes("@sha256:"));
  }, "OCI identifier must use an allowed public registry and include a tag or digest");

const McpbPackageSchema = z
  .strictObject({
    ...packageCommonShape,
    registryType: z.literal("mcpb"),
    version: SpecificVersionSchema.optional(),
    fileSha256: z.string().regex(SHA256_PATTERN),
  })
  .refine((pkg) => {
    try {
      const url = new URL(pkg.identifier);
      if (url.protocol !== "https:" || !["github.com", "www.github.com", "gitlab.com", "www.gitlab.com"].includes(url.hostname)) {
        return false;
      }
      if (!pkg.identifier.toLowerCase().includes("mcp")) return false;
      if (url.hostname.endsWith("github.com")) {
        return /^\/[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?\/[a-zA-Z0-9._-]+\/releases\/download\/[^/]+\/[^/]+$/.test(url.pathname);
      }
      return (
        /^\/[a-zA-Z0-9._-]+(?:\/[a-zA-Z0-9._-]+)*\/-\/releases\/[^/]+\/downloads\/[^/]+$/.test(url.pathname) ||
        /^\/[a-zA-Z0-9._-]+(?:\/[a-zA-Z0-9._-]+)*\/-\/package_files\/\d+\/download$/.test(url.pathname)
      );
    } catch {
      return false;
    }
  }, "MCPB identifier must be an HTTPS GitHub or GitLab release URL containing 'mcp'");

export const PackageSchema = z
  .union([
    registryPackageSchema("npm"),
    registryPackageSchema("pypi"),
    registryPackageSchema("nuget"),
    registryPackageSchema("cargo"),
    OciPackageSchema,
    McpbPackageSchema,
  ])
  .superRefine((pkg, ctx) => {
    const available = new Set<string>();
    for (const variable of pkg.environmentVariables ?? []) available.add(variable.name);
    for (const argument of [...(pkg.runtimeArguments ?? []), ...(pkg.packageArguments ?? [])]) {
      if (argument.type === "named") available.add(argument.name);
      if (argument.type === "positional" && argument.valueHint) available.add(argument.valueHint);
    }
    if (pkg.transport.type !== "stdio") {
      addUndefinedTemplateIssues(pkg.transport.url, available, ctx);
    }
  });

/** Package shape from the portable released schema, without official registry allowlists. */
export const GenericPackageSchema = z.strictObject({
  ...packageCommonShape,
  registryType: z.string().min(1),
  registryBaseUrl: z.string().url().optional(),
  version: SpecificVersionSchema.optional(),
  fileSha256: z.string().regex(SHA256_PATTERN).optional(),
});

/** Response package shape, including legacy records accepted by the Registry. */
export const ResponsePackageSchema = z.strictObject({
  ...packageCommonShape,
  registryType: z.string().min(1),
  registryBaseUrl: z.string().url().optional(),
  version: z.string().min(1).max(255).optional(),
  fileSha256: z.string().regex(SHA256_PATTERN).optional(),
});

// -------- Server JSON --------
const serverShape = {
  name: z.string().min(3).max(200).regex(SERVER_NAME_PATTERN),
  title: z.string().trim().min(1).max(100).optional(),
  description: z.string().min(1).max(100),
  version: SpecificVersionSchema,
  websiteUrl: z.string().url().refine(isHttpsUrl, "websiteUrl must use HTTPS").optional(),
  icons: z.array(IconSchema).nullable().optional(),
};

export const GenericIconSchema = z.strictObject({
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
  sizes: z.array(z.string().regex(/^(\d+x\d+|any)$/)).optional(),
  theme: z.enum(["light", "dark"]).optional(),
});

const genericServerShape = {
  name: z
    .string()
    .min(3)
    .max(200)
    .regex(/^[a-zA-Z0-9.-]+\/[a-zA-Z0-9._-]+$/),
  title: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(100),
  version: SpecificVersionSchema,
  websiteUrl: z.string().url().optional(),
  icons: z.array(GenericIconSchema).optional(),
};

export const ServerJSONSchema = z.strictObject({
  $schema: z.string().url().min(1),
  ...serverShape,
  repository: RepositorySchema.optional(),
  packages: z.array(PackageSchema).nullable().optional(),
  remotes: z.array(RemoteSchema).nullable().optional(),
  _meta: ServerJSONMetaSchema.optional(),
});

/** Portable released server.json shape. Official publishing uses ServerJSONSchema. */
export const GenericServerJSONSchema = z.strictObject({
  $schema: z.string().url().optional(),
  ...genericServerShape,
  repository: GenericRepositorySchema.optional(),
  packages: z.array(GenericPackageSchema).optional(),
  remotes: z.array(z.union([StreamableHttpTransportSchema, SseTransportSchema])).optional(),
  _meta: GenericServerJSONMetaSchema.optional(),
});

const ResponseServerJSONSchema = z.strictObject({
  $schema: z.string().url().optional(),
  ...serverShape,
  version: z.string().min(1).max(255),
  repository: ResponseRepositorySchema.optional(),
  packages: z.array(ResponsePackageSchema).nullable().optional(),
  remotes: z.array(RemoteSchema).nullable().optional(),
  _meta: ServerJSONMetaSchema.optional(),
});

export const ServerResponseSchema = z.strictObject({
  server: ResponseServerJSONSchema,
  _meta: ServerResponseMetaSchema,
});

// -------- List and pagination --------
export const MetadataSchema = z.strictObject({
  nextCursor: z.string().nullable().optional(),
  count: z.number().int().nonnegative(),
});

export const ServerListResponseSchema = z.strictObject({
  servers: z.array(ServerResponseSchema).nullable(),
  metadata: MetadataSchema,
});

export const ListServersOptionsSchema = z
  .strictObject({
    cursor: z.string().optional(),
    limit: z.number().int().min(1).max(100).optional(),
    search: z.string().optional(),
    updatedSince: RFC3339Schema.optional(),
    version: z.string().optional(),
    includeDeleted: z.boolean().optional(),
  })
  .refine(
    (options) => !(options.updatedSince && options.includeDeleted === false),
    {
      path: ["includeDeleted"],
      message: "includeDeleted cannot be false when updatedSince is provided",
    },
  );

// -------- Status updates --------
export const StatusUpdateRequestSchema = z
  .strictObject({
    status: z.enum(["active", "deprecated", "deleted"]),
    statusMessage: z.string().max(500).optional(),
  })
  .refine((request) => !(request.status === "active" && request.statusMessage !== undefined), {
    message: "statusMessage is not allowed when status is 'active'",
    path: ["statusMessage"],
  });

export const AllVersionsStatusResponseSchema = z.strictObject({
  updatedCount: z.number().int().nonnegative(),
  servers: z.array(ServerResponseSchema).nullable(),
});

// -------- Authentication --------
export const GitHubTokenExchangeInputBodySchema = z.strictObject({
  github_token: z.string().min(1),
});

export const TokenResponseSchema = z.strictObject({
  expires_at: z.number().int(),
  registry_token: z.string(),
});

export const GitHubOIDCTokenExchangeInputBodySchema = z.strictObject({
  oidc_token: z.string().min(1),
});

export const OIDCTokenExchangeInputBodySchema = z.strictObject({
  oidc_token: z.string().min(1),
});

export const SignatureTokenExchangeInputSchema = z
  .strictObject({
    domain: z
      .string()
      .max(253)
      .regex(DOMAIN_PATTERN)
      .refine((domain) => domain.toLowerCase() !== "github.io" && !domain.toLowerCase().endsWith(".github.io"), {
        message: "github.io domains must use GitHub authentication",
      }),
    signed_timestamp: z.string().min(2).regex(HEX_PATTERN).refine((value) => value.length % 2 === 0, {
      message: "Signature must contain an even number of hexadecimal characters",
    }),
    timestamp: RFC3339Schema.refine((timestamp) => Math.abs(Date.now() - Date.parse(timestamp)) <= 15_000, {
      message: "Timestamp must be within 15 seconds of the current time",
    }),
  });

export const HTTPTokenExchangeInputBodySchema = SignatureTokenExchangeInputSchema;
export const DNSTokenExchangeInputBodySchema = SignatureTokenExchangeInputSchema;

// -------- Service responses --------
export const HealthBodySchema = z.strictObject({
  status: z.string(),
  github_client_id: z.string().optional(),
});

export const PingBodySchema = z.strictObject({
  pong: z.boolean(),
});

export const VersionBodySchema = z.strictObject({
  version: z.string(),
  git_commit: z.string(),
  build_time: z.string(),
});

export const ValidationIssueSchema = z.strictObject({
  type: z.string(),
  path: z.string(),
  message: z.string(),
  severity: z.string(),
  reference: z.string(),
});

export const ValidationResultSchema = z.strictObject({
  valid: z.boolean(),
  issues: z.array(ValidationIssueSchema).nullable(),
});

export const ErrorDetailSchema = z.strictObject({
  location: z.string().optional(),
  message: z.string(),
  value: z.unknown().optional(),
});

export const ErrorModelSchema = z.strictObject({
  detail: z.string().optional(),
  errors: z.array(ErrorDetailSchema).nullable().optional(),
  instance: z.string().optional(),
  status: z.number().int().optional(),
  title: z.string().optional(),
  type: z.string().optional(),
});

// -------- Type exports --------
export type RegistryExtensions = z.infer<typeof RegistryExtensionsSchema>;
export type ServerJSONMeta = z.infer<typeof ServerJSONMetaSchema>;
export type GenericServerJSONMeta = z.infer<typeof GenericServerJSONMetaSchema>;
export type ServerResponseMeta = z.infer<typeof ServerResponseMetaSchema>;
export type Input = z.infer<typeof InputSchema>;
export type InputWithVariables = z.infer<typeof InputWithVariablesSchema>;
export type PositionalArgument = z.infer<typeof PositionalArgumentSchema>;
export type NamedArgument = z.infer<typeof NamedArgumentSchema>;
export type Argument = z.infer<typeof ArgumentSchema>;
export type KeyValueInput = z.infer<typeof KeyValueInputSchema>;
export type StdioTransport = z.infer<typeof StdioTransportSchema>;
export type StreamableHttpTransport = z.infer<typeof StreamableHttpTransportSchema>;
export type SseTransport = z.infer<typeof SseTransportSchema>;
export type Transport = z.infer<typeof TransportSchema>;
export type LocalTransport = Transport;
export type Remote = z.infer<typeof RemoteSchema>;
export type RemoteTransport = Remote;
export type Repository = z.infer<typeof RepositorySchema>;
export type ResponseRepository = z.infer<typeof ResponseRepositorySchema>;
export type GenericRepository = z.infer<typeof GenericRepositorySchema>;
export type Package = z.infer<typeof PackageSchema>;
export type GenericPackage = z.infer<typeof GenericPackageSchema>;
export type ResponsePackage = z.infer<typeof ResponsePackageSchema>;
export type ServerJSON = z.infer<typeof ServerJSONSchema>;
export type GenericServerJSON = z.infer<typeof GenericServerJSONSchema>;
export type ServerResponse = z.infer<typeof ServerResponseSchema>;
export type Icon = z.infer<typeof IconSchema>;
export type GenericIcon = z.infer<typeof GenericIconSchema>;
export type Metadata = z.infer<typeof MetadataSchema>;
export type ServerListResponse = z.infer<typeof ServerListResponseSchema>;
export type ListServersOptions = z.infer<typeof ListServersOptionsSchema>;
export type StatusUpdateRequest = z.infer<typeof StatusUpdateRequestSchema>;
export type AllVersionsStatusResponse = z.infer<typeof AllVersionsStatusResponseSchema>;
export type GitHubTokenExchangeInputBody = z.infer<typeof GitHubTokenExchangeInputBodySchema>;
export type TokenResponse = z.infer<typeof TokenResponseSchema>;
export type GitHubOIDCTokenExchangeInputBody = z.infer<typeof GitHubOIDCTokenExchangeInputBodySchema>;
export type HTTPTokenExchangeInputBody = z.infer<typeof HTTPTokenExchangeInputBodySchema>;
export type OIDCTokenExchangeInputBody = z.infer<typeof OIDCTokenExchangeInputBodySchema>;
export type DNSTokenExchangeInputBody = z.infer<typeof DNSTokenExchangeInputBodySchema>;
export type SignatureTokenExchangeInput = z.infer<typeof SignatureTokenExchangeInputSchema>;
export type HealthBody = z.infer<typeof HealthBodySchema>;
export type PingBody = z.infer<typeof PingBodySchema>;
export type VersionBody = z.infer<typeof VersionBodySchema>;
export type ValidationIssue = z.infer<typeof ValidationIssueSchema>;
export type ValidationResult = z.infer<typeof ValidationResultSchema>;
export type ErrorDetail = z.infer<typeof ErrorDetailSchema>;
export type ErrorModel = z.infer<typeof ErrorModelSchema>;
