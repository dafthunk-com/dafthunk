# Node Generator Skill

You are helping to generate a new workflow node for the Dafthunk platform. Follow these instructions carefully to create a high-quality, production-ready node implementation.

## Node Structure

Every node consists of three files:
1. **Implementation file** (`<node-name>.ts`) - The node class
2. **Test file** (`<node-name>.test.ts`) - Unit tests
3. **Registry registration** - Add to `cloudflare-node-registry.ts`

## Step 1: Gather Requirements

Ask the user for the following information if not provided:

1. **Node purpose**: What does this node do? (e.g., "Reverse a string", "Calculate average of numbers")
2. **Category**: Which category does it belong to? (text, math, logic, json, geo, etc.)
3. **Node name**: Human-readable name (e.g., "String Reverse", "Calculate Average")
4. **Node ID**: kebab-case identifier (e.g., "string-reverse", "calculate-average")
5. **Inputs**: What inputs does the node accept?
   - Name, type (string, number, boolean, json, array, etc.)
   - Description
   - Required or optional
   - Default values (if any)
   - Is it repeated? (accepts multiple connections)
6. **Outputs**: What does the node produce?
   - Name, type, description
   - Hidden outputs (for metadata like "found", "count", etc.)
7. **Icon**: lucide icon name (e.g., "text", "calculator", "git-branch")
8. **Tags**: Relevant tags for searchability
9. **Dependencies**: Any npm packages needed beyond the standard ones

## Step 2: Create Node Implementation

### File Location
`apps/api/src/nodes/<category>/<node-id>.ts`

### Template Structure

```typescript
import { NodeExecution, NodeType } from "@dafthunk/types";
// Import any additional dependencies here

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * [Brief JSDoc description of what this node does]
 */
export class [NodeClassName]Node extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "[node-id]",
    name: "[Node Display Name]",
    type: "[node-id]",
    description: "[One-line description]",
    tags: ["Category", "Tag1", "Tag2"],
    icon: "[icon-name]",
    documentation: "[Detailed documentation about what this node does and how to use it]",
    inlinable: true, // Set to true if node can be inlined in workflow
    asTool: true, // Set to true if node can be used as an AI tool
    inputs: [
      {
        name: "[inputName]",
        type: "[type]", // string, number, boolean, json, image, audio, etc.
        description: "[What this input represents]",
        required: true, // or false
        repeated: false, // true if accepts multiple connections
        // hidden: true, // if this input should be hidden by default
        // value: "default", // if there's a default value
      },
      // Add more inputs...
    ],
    outputs: [
      {
        name: "[outputName]",
        type: "[type]",
        description: "[What this output represents]",
        // hidden: true, // for metadata outputs
      },
      // Add more outputs...
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      // Extract inputs with destructuring
      const { input1, input2, optionalInput = "defaultValue" } = context.inputs;

      // DEFENSIVE PROGRAMMING: Validate required inputs first

      // Check for null/undefined
      if (input1 === null || input1 === undefined) {
        return this.createErrorResult("Missing required input: input1");
      }

      // Validate type
      if (typeof input1 !== "expectedType") {
        return this.createErrorResult(
          `Invalid input type for input1: expected expectedType, got ${typeof input1}`
        );
      }

      // Handle repeated inputs (single value vs array)
      if (nodeType.inputs.some(i => i.repeated)) {
        // Handle single value
        if (typeof input1 === "string") {
          // Process single value
        }

        // Handle array of values
        if (Array.isArray(input1)) {
          // Validate each element
          for (let i = 0; i < input1.length; i++) {
            if (typeof input1[i] !== "string") {
              return this.createErrorResult(
                `Invalid input at position ${i}: expected string, got ${typeof input1[i]}`
              );
            }
          }
          // Process array
        }
      }

      // MAIN LOGIC: Implement the node's core functionality

      // For operations that might fail, use nested try-catch
      try {
        // Risky operation (e.g., parsing, external API)
        const result = performOperation(input1);
      } catch (err) {
        const error = err as Error;
        return this.createErrorResult(
          `Operation failed: ${error.message}`
        );
      }

      // Calculate outputs
      const output1 = processedResult;
      const output2 = metadata;

      // Return success with all outputs
      return this.createSuccessResult({
        output1,
        output2,
      });
    } catch (err) {
      // Catch-all for unexpected errors
      const error = err as Error;
      return this.createErrorResult(
        `Error in [NodeName]: ${error.message}`
      );
    }
  }
}
```

### Best Practices - Defensive Programming

1. **Early returns for validation**
   - Check null/undefined first
   - Validate types second
   - Check ranges/constraints third
   - Return descriptive error messages

2. **Handle all input variations**
   - Single values vs arrays (for repeated inputs)
   - Optional inputs with defaults
   - Type coercion where appropriate (e.g., Number() for numeric inputs)

3. **Error messages**
   - Be specific: include the input name, expected type, actual type
   - For arrays: include the position/index of the invalid element
   - For operations: include context about what failed

4. **Type safety**
   - Use `typeof` checks for primitive types
   - Use `Array.isArray()` for arrays
   - Use `instanceof` for class instances
   - Cast errors: `err as Error` or `error instanceof Error`

5. **Nested try-catch**
   - Outer try-catch for unexpected errors
   - Inner try-catch for specific operations that might fail
   - Provide context-specific error messages

6. **Handle edge cases**
   - Empty arrays
   - Empty strings
   - Zero values
   - Negative numbers (if invalid)
   - Very large numbers
   - Special characters in strings

## Step 3: Create Test File

### File Location
`apps/api/src/nodes/<category>/<node-id>.test.ts`

### Template Structure

```typescript
import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { [NodeClassName]Node } from "./<node-id>";

describe("[NodeClassName]Node", () => {
  // Happy path - normal operation
  it("should [perform expected operation]", async () => {
    const nodeId = "[node-id]";
    const node = new [NodeClassName]Node({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        input1: "test value",
        input2: 42,
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.output1).toBe("expected value");
  });

  // Edge cases
  it("should handle empty input", async () => {
    const nodeId = "[node-id]";
    const node = new [NodeClassName]Node({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        input1: "",
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.output1).toBe("expected for empty");
  });

  // Error cases
  it("should return error for missing input", async () => {
    const nodeId = "[node-id]";
    const node = new [NodeClassName]Node({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("Missing required input");
  });

  it("should return error for invalid type", async () => {
    const nodeId = "[node-id]";
    const node = new [NodeClassName]Node({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        input1: 123, // Wrong type
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("Invalid input type");
  });

  // For repeated inputs (arrays)
  it("should handle array of inputs", async () => {
    const nodeId = "[node-id]";
    const node = new [NodeClassName]Node({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        input1: ["value1", "value2", "value3"],
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.output1).toBe("expected result");
  });

  it("should return error for invalid element in array", async () => {
    const nodeId = "[node-id]";
    const node = new [NodeClassName]Node({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        input1: ["valid", 123, "valid"], // Invalid element at position 1
      },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("position 1");
  });

  // Add more test cases for:
  // - Boundary conditions
  // - Type coercion (if applicable)
  // - Large inputs
  // - Special characters
  // - Numeric ranges (negative, zero, very large)
});
```

### Test Coverage Guidelines

Create tests for:
1. **Happy path**: Normal operation with valid inputs
2. **Edge cases**: Empty values, boundary values, extremes
3. **Error cases**: Missing inputs, wrong types, invalid values
4. **Array handling**: Single values, multiple values, invalid elements
5. **Type coercion**: If the node converts types (e.g., string to number)
6. **Special cases**: Any domain-specific edge cases

## Step 4: Register the Node

### File Location
`apps/api/src/nodes/cloudflare-node-registry.ts`

### Steps

1. **Add import at the top** (alphabetically within category):
```typescript
import { [NodeClassName]Node } from "./<category>/<node-id>";
```

2. **Register in constructor** (alphabetically within category):
```typescript
this.registerImplementation([NodeClassName]Node);
```

Find the appropriate section for your category (text, math, logic, etc.) and add the import and registration in alphabetical order.

## Step 5: Run Tests

After creating the files, run tests to verify:

```bash
# Type check
pnpm typecheck

# Run the specific test
pnpm --filter '@dafthunk/api' test <node-id>

# Run all tests
pnpm --filter '@dafthunk/api' test
```

## Step 6: Summary

After generating all files, provide a summary:

1. List the files created
2. Confirm registration in the registry
3. Show the test command to run
4. Provide any additional notes (dependencies to install, etc.)

## Common Patterns Reference

### Repeated Inputs (Arrays)
```typescript
const { values } = context.inputs;

if (values === null || values === undefined) {
  return this.createErrorResult("No values provided");
}

// Single value
if (typeof values === "string") {
  return this.createSuccessResult({ result: values });
}

// Array of values
if (Array.isArray(values)) {
  for (let i = 0; i < values.length; i++) {
    if (typeof values[i] !== "string") {
      return this.createErrorResult(
        `Invalid input at position ${i}: expected string, got ${typeof values[i]}`
      );
    }
  }
  const result = values.join("");
  return this.createSuccessResult({ result });
}

return this.createErrorResult(
  "Invalid input type: expected string or array of strings"
);
```

### Number Validation with Coercion
```typescript
const { numbers } = context.inputs;

if (Array.isArray(numbers)) {
  for (let i = 0; i < numbers.length; i++) {
    const num = Number(numbers[i]);
    if (isNaN(num)) {
      return this.createErrorResult(
        `Invalid input at position ${i}: expected number, got ${typeof numbers[i]}`
      );
    }
  }
  const result = numbers.reduce((sum, num) => sum + Number(num), 0);
  return this.createSuccessResult({ result });
}
```

### Optional Inputs with Defaults
```typescript
const { required, optional = "default" } = context.inputs;
```

### External Dependencies
If the node uses external libraries (like JSONPath, turf for geo, etc.):
```typescript
import { JSONPath } from "jsonpath-plus";

try {
  const results = JSONPath({ path, json });
  // Process results
} catch (err) {
  const error = err as Error;
  return this.createErrorResult(
    `Invalid JSONPath expression: ${error.message}`
  );
}
```

## Ready to Generate!

Now ask the user for their requirements and generate a complete, production-ready node following all these patterns and best practices.
