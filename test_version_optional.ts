import { PackageSchema } from "./types.ts";

// Test 1: version should be optional in the inferred type
const packageWithoutVersion = PackageSchema.parse({
  registryType: "npm",
  identifier: "test-package",
});

console.log("✓ Package without version parsed successfully:", packageWithoutVersion);

// Test 2: version should be optional and nullable behavior
const packageWithVersion = PackageSchema.parse({
  registryType: "npm",
  identifier: "test-package",
  version: "1.0.0",
});

console.log("✓ Package with version parsed successfully:", packageWithVersion);

// Test 3: TypeScript should allow undefined version
const testTypeAnnotation: import("./types.ts").Package = {
  registryType: "npm",
  identifier: "test-package",
  // version omitted - should be fine
};

console.log("✓ TypeScript allows Package without version field");

console.log("\nAll tests passed! The version field is correctly optional in the TypeScript type.");
