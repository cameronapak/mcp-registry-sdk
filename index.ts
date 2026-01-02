import type {
  DNSTokenExchangeInputBody,
  ErrorModel,
  GitHubOIDCTokenExchangeInputBody,
  GitHubTokenExchangeInputBody,
  HealthBody,
  HTTPTokenExchangeInputBody,
  ListServersOptions,
  OIDCTokenExchangeInputBody,
  PingBody,
  ServerJSON,
  ServerResponse,
  ServerListResponse,
  SignatureTokenExchangeInput,
  TokenResponse,
  VersionBody,
} from "./types.ts";

/**
 * Structured error with parsed registry problem+json details
 */
export class RegistryError extends Error {
  public error?: ErrorModel;
  public status?: number;

  constructor(message: string, error?: ErrorModel) {
    super(message);
    this.name = "RegistryError";
    this.error = error;
    this.status = error?.status;
  }
}

async function parseErrorModel(response: Response): Promise<ErrorModel | undefined> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return {
      detail: text || `${response.status} ${response.statusText}`,
      errors: null,
      instance: "",
      status: response.status,
      title: response.statusText,
      type: "about:blank",
    };
  }
}

/**
 * Authentication namespace for MCP Registry API
 */
export class AuthNamespace {
  private baseUrl: string;
  private apiVersion: string;

  constructor(baseUrl: string, apiVersion: string) {
    this.baseUrl = baseUrl;
    this.apiVersion = apiVersion;
  }

  /**
   * Exchange GitHub OAuth access token for Registry JWT
   * {@see https://registry.modelcontextprotocol.io/docs#/operations/exchange-github-token}
   */
  async exchangeGitHubOAuthAccessTokenForRegistryJWT(
    { github_token }: GitHubTokenExchangeInputBody,
  ): Promise<TokenResponse> {
    const url = `${this.baseUrl}/${this.apiVersion}/auth/github-at`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Accept": "application/json, application/problem+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        github_token: github_token,
      }),
    });

    if (!response.ok) {
      const errorModel = await parseErrorModel(response);
      throw new RegistryError(
        `Failed to exchange GitHub token: ${errorModel?.title || response.statusText} - ${errorModel?.detail || ""}`,
        errorModel,
      );
    }

    return await response.json();
  }

  /**
   * Exchange GitHub OIDC token for Registry JWT
   * {@see https://registry.modelcontextprotocol.io/docs#/operations/exchange-github-oidc-token}
   */
  async exchangeGitHubOIDCTokenForRegistryJWT(
    { oidc_token }: GitHubOIDCTokenExchangeInputBody,
  ): Promise<TokenResponse> {
    const url = `${this.baseUrl}/${this.apiVersion}/auth/github-oidc`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Accept": "application/json, application/problem+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        oidc_token,
      }),
    });

    if (!response.ok) {
      const errorModel = await parseErrorModel(response);
      throw new RegistryError(
        `Failed to exchange GitHub OIDC token: ${errorModel?.title || response.statusText} - ${errorModel?.detail || ""}`,
        errorModel,
      );
    }

    return await response.json();
  }

  /**
   * Exchange HTTP signature for Registry JWT
   * {@see https://registry.modelcontextprotocol.io/docs#/operations/exchange-http-token}
   */
  async exchangeHTTPSignatureForRegistryJWT(
    signatureTokenExchangeInput: SignatureTokenExchangeInput,
  ): Promise<TokenResponse> {
    const url = `${this.baseUrl}/${this.apiVersion}/auth/http`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Accept": "application/json, application/problem+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(signatureTokenExchangeInput),
    });

    if (!response.ok) {
      const errorModel = await parseErrorModel(response);
      throw new RegistryError(
        `Failed to exchange HTTP signature: ${errorModel?.title || response.statusText} - ${errorModel?.detail || ""}`,
        errorModel,
      );
    }

    return await response.json();
  }

  /**
   * Exchange OIDC ID token for Registry JWT
   * {@see https://registry.modelcontextprotocol.io/docs#/operations/exchange-oidc-token}
   */
  async exchangeOIDCIDTokenForRegistryJWT(
    { oidc_token }: OIDCTokenExchangeInputBody,
  ): Promise<TokenResponse> {
    const url = `${this.baseUrl}/${this.apiVersion}/auth/oidc`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Accept": "application/json, application/problem+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        oidc_token: oidc_token,
      }),
    });

    if (!response.ok) {
      const errorModel = await parseErrorModel(response);
      throw new RegistryError(
        `Failed to exchange OIDC token: ${errorModel?.title || response.statusText} - ${errorModel?.detail || ""}`,
        errorModel,
      );
    }

    return await response.json();
  }

  /**
   * Exchange DNS signature for Registry JWT
   * {@see https://registry.modelcontextprotocol.io/docs#/operations/exchange-dns-token}
   */
  async exchangeDNSSignatureForRegistryJWT(
    signatureTokenExchangeInput: SignatureTokenExchangeInput,
  ): Promise<TokenResponse> {
    const url = `${this.baseUrl}/${this.apiVersion}/auth/dns`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Accept": "application/json, application/problem+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(signatureTokenExchangeInput),
    });

    if (!response.ok) {
      const errorModel = await parseErrorModel(response);
      throw new RegistryError(
        `Failed to exchange DNS signature: ${errorModel?.title || response.statusText} - ${errorModel?.detail || ""}`,
        errorModel,
      );
    }

    return await response.json();
  }
}

/**
 * Health namespace for MCP Registry API
 */
export class HealthNamespace {
  private baseUrl: string;
  private apiVersion: string;

  constructor(baseUrl: string, apiVersion: string) {
    this.baseUrl = baseUrl;
    this.apiVersion = apiVersion;
  }

  /**
   * Check the health status of the API
   * {@see https://registry.modelcontextprotocol.io/docs#/operations/get-health}
   */
  async getHealth(): Promise<HealthBody> {
    const url = `${this.baseUrl}/${this.apiVersion}/health`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json, application/problem+json",
      },
    });

    if (!response.ok) {
      const errorModel = await parseErrorModel(response);
      throw new RegistryError(
        `Failed to get health status: ${errorModel?.title || response.statusText} - ${errorModel?.detail || ""}`,
        errorModel,
      );
    }

    return await response.json();
  }
}

/**
 * Ping namespace for MCP Registry API
 */
export class PingNamespace {
  private baseUrl: string;
  private apiVersion: string;

  constructor(baseUrl: string, apiVersion: string) {
    this.baseUrl = baseUrl;
    this.apiVersion = apiVersion;
  }

  /**
   * Ping the registry API
   * {@see https://registry.modelcontextprotocol.io/docs#/operations/ping}
   */
  async ping(): Promise<PingBody> {
    const url = `${this.baseUrl}/${this.apiVersion}/ping`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json, application/problem+json",
      },
    });

    if (!response.ok) {
      const errorModel = await parseErrorModel(response);
      throw new RegistryError(
        `Failed to ping: ${errorModel?.title || response.statusText} - ${errorModel?.detail || ""}`,
        errorModel,
      );
    }

    return await response.json();
  }
}

/**
 * Version namespace for MCP Registry API
 */
export class VersionNamespace {
  private baseUrl: string;
  private apiVersion: string;

  constructor(baseUrl: string, apiVersion: string) {
    this.baseUrl = baseUrl;
    this.apiVersion = apiVersion;
  }

  /**
   * Get version information about the registry
   * {@see https://registry.modelcontextprotocol.io/docs#/operations/get-version}
   */
  async getVersion(): Promise<VersionBody> {
    const url = `${this.baseUrl}/${this.apiVersion}/version`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json, application/problem+json",
      },
    });

    if (!response.ok) {
      const errorModel = await parseErrorModel(response);
      throw new RegistryError(
        `Failed to get version: ${errorModel?.title || response.statusText} - ${errorModel?.detail || ""}`,
        errorModel,
      );
    }

    return await response.json();
  }
}

/**
 * Server namespace for MCP Registry API
 */
export class ServerNamespace {
  private baseUrl: string;
  private apiVersion: string;

  constructor(baseUrl: string, apiVersion: string) {
    this.baseUrl = baseUrl;
    this.apiVersion = apiVersion;
  }

  /**
   * List MCP servers with optional filtering and pagination
   * {@see https://registry.modelcontextprotocol.io/docs#/operations/list-servers}
   */
  async listServers(
    options: ListServersOptions = {},
  ): Promise<ServerListResponse> {
    const params = new URLSearchParams();

    if (options.cursor) params.append("cursor", options.cursor);
    if (options.limit) params.append("limit", options.limit.toString());
    if (options.search) params.append("search", options.search);
    if (options.updatedSince) {
      params.append("updatedSince", options.updatedSince);
    }
    if (options.version) params.append("version", options.version);

    const url = `${this.baseUrl}/${this.apiVersion}/servers${
      params.toString() ? `?${params.toString()}` : ""
    }`;

    const response = await fetch(url, {
      headers: {
        "Accept": "application/json, application/problem+json",
      },
    });

    if (!response.ok) {
      const errorModel = await parseErrorModel(response);
      throw new RegistryError(
        `Failed to list servers: ${errorModel?.title || response.statusText} - ${errorModel?.detail || ""}`,
        errorModel,
      );
    }

    return await response.json();
  }

  /**
   * Get server by name (latest or requested version via dedicated endpoints)
   * {@see https://registry.modelcontextprotocol.io/docs#/operations/get-server}
   * @deprecated Use getServerVersion(name, 'latest') instead
   */
  async getServerByName(serverName: string): Promise<ServerResponse> {
    console.warn(
      'getServerByName() is deprecated. Use getServerVersion(name, "latest") instead.',
    );
    const url = `${this.baseUrl}/${this.apiVersion}/servers/${encodeURIComponent(serverName)}/versions/latest`;

    const response = await fetch(url, {
      headers: {
        "Accept": "application/json, application/problem+json",
      },
    });

    if (!response.ok) {
      const errorModel = await parseErrorModel(response);
      throw new RegistryError(
        `Failed to get server ${serverName}: ${errorModel?.title || response.statusText} - ${errorModel?.detail || ""}`,
        errorModel,
      );
    }

    return await response.json();
  }

  /**
   * List all versions for a server by name
   */
  async listServerVersions(serverName: string): Promise<ServerResponse[]> {
    const url = `${this.baseUrl}/${this.apiVersion}/servers/${encodeURIComponent(serverName)}/versions`;

    const response = await fetch(url, {
      headers: {
        "Accept": "application/json, application/problem+json",
      },
    });

    if (!response.ok) {
      const errorModel = await parseErrorModel(response);
      throw new RegistryError(
        `Failed to list versions for ${serverName}: ${errorModel?.title || response.statusText} - ${errorModel?.detail || ""}`,
        errorModel,
      );
    }

    return await response.json();
  }

  /**
   * Get a specific version for a server by name
   */
  async getServerVersion(serverName: string, version: string): Promise<ServerResponse> {
    const url = `${this.baseUrl}/${this.apiVersion}/servers/${encodeURIComponent(serverName)}/versions/${encodeURIComponent(version)}`;

    const response = await fetch(url, {
      headers: {
        "Accept": "application/json, application/problem+json",
      },
    });

    if (!response.ok) {
      const errorModel = await parseErrorModel(response);
      throw new RegistryError(
        `Failed to get version ${version} for ${serverName}: ${errorModel?.title || response.statusText} - ${errorModel?.detail || ""}`,
        errorModel,
      );
    }

    return await response.json();
  }
}

/**
 * Admin namespace for MCP Registry API
 */
export class AdminNamespace {
  private baseUrl: string;
  private apiVersion: string;
  private getAuthToken?: () => string | undefined;

  constructor(baseUrl: string, apiVersion: string, getAuthToken?: () => string | undefined) {
    this.baseUrl = baseUrl;
    this.apiVersion = apiVersion;
    this.getAuthToken = getAuthToken;
  }

  /**
   * Edit an existing server version (admin only)
   * {@see https://registry.modelcontextprotocol.io/docs#/operations/edit-server}
   */
  async editServerVersion(
    serverName: string,
    version: string,
    server: ServerJSON,
    registryToken?: string,
  ): Promise<ServerResponse> {
    const url = `${this.baseUrl}/${this.apiVersion}/servers/${encodeURIComponent(serverName)}/versions/${encodeURIComponent(version)}`;

    const token = registryToken ?? this.getAuthToken?.();
    if (!token) {
      throw new RegistryError("Missing registry token for editServerVersion");
    }

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Accept": "application/json, application/problem+json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(server),
    });

    if (!response.ok) {
      const errorModel = await parseErrorModel(response);
      throw new RegistryError(
        `Failed to edit server version: ${errorModel?.title || response.statusText} - ${errorModel?.detail || ""}`,
        errorModel,
      );
    }

    return await response.json();
  }
}

/**
 * Publish namespace for MCP Registry API
 */
export class PublishNamespace {
  private baseUrl: string;
  private apiVersion: string;
  private getAuthToken?: () => string | undefined;

  constructor(baseUrl: string, apiVersion: string, getAuthToken?: () => string | undefined) {
    this.baseUrl = baseUrl;
    this.apiVersion = apiVersion;
    this.getAuthToken = getAuthToken;
  }

  /**
   * Publish a new MCP server to the registry or update an existing one
   * {@see https://registry.modelcontextprotocol.io/docs#/operations/publish-server}
   */
  async publishServer(
    server: ServerJSON,
    registryToken?: string,
  ): Promise<ServerResponse> {
    const url = `${this.baseUrl}/${this.apiVersion}/publish`;

    const token = registryToken ?? this.getAuthToken?.();
    if (!token) {
      throw new RegistryError("Missing registry token for publishServer");
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Accept": "application/json, application/problem+json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(server),
    });

    if (!response.ok) {
      const errorModel = await parseErrorModel(response);
      throw new RegistryError(
        `Failed to publish server: ${errorModel?.title || response.statusText} - ${errorModel?.detail || ""}`,
        errorModel,
      );
    }

    return await response.json();
  }
}

/**
 * MCP Registry SDK - Simple class-based client for the official MCP Registry API
 * {@see https://registry.modelcontextprotocol.io/docs}
 * 
 * @param baseUrl - Registry base URL (default: https://registry.modelcontextprotocol.io)
 * @param apiVersion - API version: 'v0' (development, evolving) or 'v0.1' (stable, backward-compatible only)
 *                     Default: 'v0' for backward compatibility. Use 'v0.1' for production.
 */
export class MCPRegistryClient {
  private baseUrl: string;
  private apiVersion: "v0" | "v0.1";
  public auth: AuthNamespace;
  public server: ServerNamespace;
  public health: HealthNamespace;
  public ping: PingNamespace;
  public version: VersionNamespace;
  public publish: PublishNamespace;
  public admin: AdminNamespace;

  // Optional default token used by publish/admin when not provided per-call
  private defaultAuthToken?: string;

  constructor(
    baseUrl: string = "https://registry.modelcontextprotocol.io",
    apiVersion: "v0" | "v0.1" = "v0",
  ) {
    this.baseUrl = baseUrl;
    this.apiVersion = apiVersion;
    this.auth = new AuthNamespace(this.baseUrl, this.apiVersion);
    this.server = new ServerNamespace(this.baseUrl, this.apiVersion);
    this.health = new HealthNamespace(this.baseUrl, this.apiVersion);
    this.ping = new PingNamespace(this.baseUrl, this.apiVersion);
    this.version = new VersionNamespace(this.baseUrl, this.apiVersion);
    this.publish = new PublishNamespace(this.baseUrl, this.apiVersion, () => this.defaultAuthToken);
    this.admin = new AdminNamespace(this.baseUrl, this.apiVersion, () => this.defaultAuthToken);
  }

  /**
   * Set or clear the default Authorization token used by publish/admin calls.
   * Pass undefined to clear.
   */
  public setAuthToken(token?: string) {
    this.defaultAuthToken = token;
  }
}

export type {
  Argument,
  DNSTokenExchangeInputBody,
  ErrorDetail,
  ErrorModel,
  GitHubOIDCTokenExchangeInputBody,
  GitHubTokenExchangeInputBody,
  HealthBody,
  HTTPTokenExchangeInputBody,
  Icon,
  ListServersOptions,
  Metadata,
  OIDCTokenExchangeInputBody,
  Package,
  PingBody,
  RegistryExtensions,
  Remote,
  Repository,
  ServerJSON,
  ServerJSONMeta,
  ServerListResponse,
  ServerResponse,
  ServerResponseMeta,
  SignatureTokenExchangeInput,
  TokenResponse,
  VersionBody,
  StdioTransport,
  StreamableHttpTransport,
  SseTransport,
} from "./types.ts";
// Re-export ALL Zod schemas as runtime values for consumers
export {
  IconSchema,
  RegistryExtensionsSchema,
  ServerJSONMetaSchema,
  ServerResponseMetaSchema,
  ArgumentSchema,
  InputSchema,
  KeyValueInputSchema,
  StdioTransportSchema,
  StreamableHttpTransportSchema,
  SseTransportSchema,
  TransportSchema,
  RemoteSchema,
  RepositorySchema,
  PackageSchema,
  ServerJSONSchema,
  ServerResponseSchema,
  MetadataSchema,
  ServerListResponseSchema,
  ListServersOptionsSchema,
  GitHubTokenExchangeInputBodySchema,
  TokenResponseSchema,
  GitHubOIDCTokenExchangeInputBodySchema,
  HTTPTokenExchangeInputBodySchema,
  OIDCTokenExchangeInputBodySchema,
  SignatureTokenExchangeInputSchema,
  DNSTokenExchangeInputBodySchema,
  HealthBodySchema,
  PingBodySchema,
  VersionBodySchema,
  ErrorDetailSchema,
  ErrorModelSchema,
} from "./types.ts";
