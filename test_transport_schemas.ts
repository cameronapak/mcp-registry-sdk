import {
  StdioTransportSchema,
  StreamableHttpTransportSchema,
  SseTransportSchema,
  TransportSchema,
  RemoteSchema,
} from "./types.ts";

console.log("Testing transport schemas...");

// Test StdioTransport
const stdioTransport = { type: 'stdio' as const };
const stdioResult = StdioTransportSchema.safeParse(stdioTransport);
console.log("StdioTransport (valid):", stdioResult.success ? "✓" : "✗", stdioResult.error?.issues);

const invalidStdio = { type: 'stdio', url: 'https://example.com' };
const invalidStdioResult = StdioTransportSchema.safeParse(invalidStdio);
console.log("StdioTransport (extra field):", invalidStdioResult.success ? "✗" : "✓");

// Test StreamableHttpTransport
const httpTransport = { type: 'streamable-http' as const, url: 'https://example.com/mcp' };
const httpResult = StreamableHttpTransportSchema.safeParse(httpTransport);
console.log("StreamableHttpTransport (valid):", httpResult.success ? "✓" : "✗", httpResult.error?.issues);

const httpWithHeaders = {
  type: 'streamable-http' as const,
  url: 'https://example.com/mcp',
  headers: [{ name: 'Authorization', value: 'Bearer token' }]
};
const httpWithHeadersResult = StreamableHttpTransportSchema.safeParse(httpWithHeaders);
console.log("StreamableHttpTransport (with headers):", httpWithHeadersResult.success ? "✓" : "✗");

// Test SseTransport
const sseTransport = { type: 'sse' as const, url: 'https://example.com/sse' };
const sseResult = SseTransportSchema.safeParse(sseTransport);
console.log("SseTransport (valid):", sseResult.success ? "✓" : "✗", sseResult.error?.issues);

// Test TransportSchema discriminated union
const validTransports = [stdioTransport, httpTransport, sseTransport];
validTransports.forEach((t, i) => {
  const result = TransportSchema.safeParse(t);
  console.log(`TransportSchema [${i}] (${t.type}):`, result.success ? "✓" : "✗", result.error?.issues);
});

const invalidTransport = { type: 'invalid-type' as const, url: 'https://example.com' };
const invalidResult = TransportSchema.safeParse(invalidTransport);
console.log("TransportSchema (invalid type):", invalidResult.success ? "✗" : "✓");

// Test RemoteSchema with variables
const httpRemote = {
  type: 'streamable-http' as const,
  url: 'https://example.com/mcp/{tenant_id}',
  variables: {
    tenant_id: {
      description: 'Tenant ID',
      isRequired: true,
      type: 'positional' as const
    }
  }
};
const httpRemoteResult = RemoteSchema.safeParse(httpRemote);
console.log("RemoteSchema (streamable-http with variables):", httpRemoteResult.success ? "✓" : "✗", httpRemoteResult.error?.issues);

const sseRemote = {
  type: 'sse' as const,
  url: 'https://example.com/sse/{user_id}',
  variables: {
    user_id: {
      description: 'User ID',
      isRequired: true,
      type: 'positional' as const
    }
  }
};
const sseRemoteResult = RemoteSchema.safeParse(sseRemote);
console.log("RemoteSchema (sse with variables):", sseRemoteResult.success ? "✓" : "✗", sseRemoteResult.error?.issues);

// Test RemoteSchema without variables (optional)
const httpRemoteNoVars = {
  type: 'streamable-http' as const,
  url: 'https://example.com/mcp'
};
const httpRemoteNoVarsResult = RemoteSchema.safeParse(httpRemoteNoVars);
console.log("RemoteSchema (without variables):", httpRemoteNoVarsResult.success ? "✓" : "✗");

// Test stdio transport in RemoteSchema (should fail)
const stdioRemote = { type: 'stdio' as const };
const stdioRemoteResult = RemoteSchema.safeParse(stdioRemote);
console.log("RemoteSchema (stdio - should fail):", stdioRemoteResult.success ? "✗" : "✓");

console.log("\nAll schema tests completed!");
