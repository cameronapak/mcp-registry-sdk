import { assertEquals, assertRejects } from "jsr:@std/assert";
import {
  MCPRegistryClient,
  RegistryError,
  StdioTransportSchema,
  StreamableHttpTransportSchema,
  SseTransportSchema,
  IconSchema,
} from "../index.ts";

const defaultClient = new MCPRegistryClient();

Deno.test("StdioTransportSchema validates correct type", () => {
  const validInput = { type: 'stdio' as const };
  const result = StdioTransportSchema.safeParse(validInput);
  
  assertEquals(result.success, true, "valid stdio transport should parse");
});

Deno.test("StdioTransportSchema rejects invalid type", () => {
  const invalidInput = { type: 'invalid' };
  const result = StdioTransportSchema.safeParse(invalidInput);
  
  assertEquals(result.success, false, "invalid type should be rejected");
});

Deno.test("StreamableHttpTransportSchema validates with required fields", () => {
  const validInput = {
    type: 'streamable-http' as const,
    url: 'https://example.com/mcp'
  };
  const result = StreamableHttpTransportSchema.safeParse(validInput);
  
  assertEquals(result.success, true, "valid http transport should parse");
});

Deno.test("StreamableHttpTransportSchema validates with optional headers", () => {
  const validInput = {
    type: 'streamable-http' as const,
    url: 'https://example.com/mcp',
    headers: [
      { name: 'Authorization', value: 'Bearer token' }
    ]
  };
  const result = StreamableHttpTransportSchema.safeParse(validInput);
  
  assertEquals(result.success, true, "http transport with headers should parse");
});

Deno.test("StreamableHttpTransportSchema rejects missing url", () => {
  const invalidInput = {
    type: 'streamable-http' as const
  };
  const result = StreamableHttpTransportSchema.safeParse(invalidInput);
  
  assertEquals(result.success, false, "http transport without url should be rejected");
});

Deno.test("SseTransportSchema validates with required fields", () => {
  const validInput = {
    type: 'sse' as const,
    url: 'https://example.com/events'
  };
  const result = SseTransportSchema.safeParse(validInput);
  
  assertEquals(result.success, true, "valid sse transport should parse");
});

Deno.test("SseTransportSchema validates with optional headers", () => {
  const validInput = {
    type: 'sse' as const,
    url: 'https://example.com/events',
    headers: [
      { name: 'Authorization', value: 'Bearer token' }
    ]
  };
  const result = SseTransportSchema.safeParse(validInput);
  
  assertEquals(result.success, true, "sse transport with headers should parse");
});

Deno.test("IconSchema validates with required src field", () => {
  const validInput = {
    src: 'https://example.com/icon.png'
  };
  const result = IconSchema.safeParse(validInput);
  
  assertEquals(result.success, true, "valid icon with src only should parse");
});

Deno.test("IconSchema validates with all optional fields", () => {
  const validInput = {
    src: 'https://example.com/icon.png',
    mimeType: 'image/png' as const,
    sizes: ['32x32', '64x64'],
    theme: 'light' as const
  };
  const result = IconSchema.safeParse(validInput);
  
  assertEquals(result.success, true, "icon with all optional fields should parse");
});

Deno.test("IconSchema accepts valid mimeType values", () => {
  const validMimeTypes = [
    'image/png' as const,
    'image/jpeg' as const,
    'image/jpg' as const,
    'image/svg+xml' as const,
    'image/webp' as const
  ];
  
  validMimeTypes.forEach(mimeType => {
    const input = { src: 'https://example.com/icon.png', mimeType };
    const result = IconSchema.safeParse(input);
    
    assertEquals(result.success, true, `${mimeType} should be valid`);
  });
});

Deno.test("IconSchema rejects invalid mimeType", () => {
  const invalidInput = {
    src: 'https://example.com/icon.png',
    mimeType: 'image/tiff' as const
  };
  const result = IconSchema.safeParse(invalidInput);
  
  assertEquals(result.success, false, "invalid mimeType should be rejected");
});

Deno.test("IconSchema validates sizes pattern (WxH)", () => {
  const validInput = {
    src: 'https://example.com/icon.png',
    sizes: ['32x32', '64x64', '128x128']
  };
  const result = IconSchema.safeParse(validInput);
  
  assertEquals(result.success, true, "sizes with WxH pattern should parse");
});

Deno.test("IconSchema validates sizes pattern (any)", () => {
  const validInput = {
    src: 'https://example.com/icon.png',
    sizes: ['any']
  };
  const result = IconSchema.safeParse(validInput);
  
  assertEquals(result.success, true, "sizes with 'any' should parse");
});

Deno.test("IconSchema rejects invalid sizes pattern", () => {
  const invalidInput = {
    src: 'https://example.com/icon.png',
    sizes: ['invalid', '32']
  };
  const result = IconSchema.safeParse(invalidInput);
  
  assertEquals(result.success, false, "invalid sizes pattern should be rejected");
});

Deno.test("IconSchema accepts valid theme values", () => {
  const validThemes = ['light' as const, 'dark' as const];
  
  validThemes.forEach(theme => {
    const input = { src: 'https://example.com/icon.png', theme };
    const result = IconSchema.safeParse(input);
    
    assertEquals(result.success, true, `${theme} theme should be valid`);
  });
});

Deno.test("IconSchema rejects non-URL src", () => {
  const invalidInput = {
    src: 'not-a-url'
  };
  const result = IconSchema.safeParse(invalidInput);
  
  assertEquals(result.success, false, "non-URL src should be rejected");
});

Deno.test("IconSchema rejects src exceeding 255 characters", () => {
  const longUrl = 'https://example.com/' + 'a'.repeat(300);
  const invalidInput = {
    src: longUrl
  };
  const result = IconSchema.safeParse(invalidInput);
  
  assertEquals(result.success, false, "src exceeding 255 chars should be rejected");
});
