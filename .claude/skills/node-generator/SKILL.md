---
name: node-generator
description: Generate new workflow nodes with implementation, tests, and registry registration
---

# Node Generator Skill

Generate workflow nodes for Dafthunk: research requirements, create implementation and tests, register in the node registry.

## Step 1: Research and Define Requirements

When a user requests a new node, research first, then present a complete specification for confirmation.

**Research the functionality:**
- If based on a library/API: Use WebSearch or WebFetch to find official documentation
- Look for function signatures, parameters, return types, and examples
- Check if the package exists in `apps/api/package.json` or search npm for the latest version

**Check existing patterns:**
- Search `apps/api/src/nodes/<category>/` for similar nodes
- Examine 2-3 similar implementations to understand input/output patterns and validation approaches

**Draft complete requirements:**
- Node purpose, category, name, and kebab-case ID
- Inputs: names, types, descriptions, required/optional, defaults, repeated (from function signature/docs)
- Outputs: primary outputs and metadata outputs (hidden: true for counts, flags, etc.)
- Icon: appropriate lucide icon name
- Tags: category + relevant keywords
- Dependencies: package name and version if needed

**Present for confirmation:**
```markdown
Based on [library/API/functionality], here's the proposed node:

**Name**: [Node Name]
**ID**: `node-id`
**Category**: category
**Icon**: icon-name

**Inputs**:
- `inputName` (type, required/optional): Description

**Outputs**:
- `outputName` (type): Description
- `metadata` (type, hidden): Description

**Dependencies**:
- package-name@^version

**Tags**: Category, Tag1, Tag2

Does this match your requirements?
```

Only ask for information you cannot reasonably infer or research. The goal is to present a complete, research-backed specification that the user only needs to approve or tweak.

## Step 2: Create Node Implementation

**File:** `apps/api/src/nodes/<category>/<node-id>.ts`

```typescript
import { NodeExecution, NodeType } from "@dafthunk/types";
import { ExecutableNode, NodeContext } from "../types";

export class [NodeClassName]Node extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "[node-id]",
    name: "[Node Display Name]",
    type: "[node-id]",
    description: "[One-line description]",
    tags: ["Category", "Tag1", "Tag2"],
    icon: "[icon-name]",
    documentation: "[Detailed documentation]",
    inlinable: false,
    asTool: false,
    inputs: [
      {
        name: "[inputName]",
        type: "[type]",
        description: "[Description]",
        required: true,
        repeated: false,
      },
    ],
    outputs: [
      {
        name: "[outputName]",
        type: "[type]",
        description: "[Description]",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { input1, optionalInput = "default" } = context.inputs;

      // Validate required inputs
      if (input1 === null || input1 === undefined) {
        return this.createErrorResult("Missing required input: input1");
      }

      if (typeof input1 !== "expectedType") {
        return this.createErrorResult(
          `Invalid input type for input1: expected expectedType, got ${typeof input1}`
        );
      }

      // Handle repeated inputs (arrays)
      if (Array.isArray(input1)) {
        for (let i = 0; i < input1.length; i++) {
          if (typeof input1[i] !== "string") {
            return this.createErrorResult(
              `Invalid input at position ${i}: expected string, got ${typeof input1[i]}`
            );
          }
        }
      }

      // Main logic
      const result = processInput(input1);

      return this.createSuccessResult({ output1: result });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(`Error in [NodeName]: ${error.message}`);
    }
  }
}
```

**Defensive programming checklist:**
- Validate null/undefined, then types, then ranges/constraints
- Handle single values and arrays for repeated inputs
- Use descriptive error messages with input names and types
- Use nested try-catch for risky operations (parsing, external APIs)
- Handle edge cases: empty arrays/strings, zero/negative numbers

## Step 3: Create Test File

**File:** `apps/api/src/nodes/<category>/<node-id>.test.ts`

```typescript
import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { NodeContext } from "../types";
import { [NodeClassName]Node } from "./<node-id>";

describe("[NodeClassName]Node", () => {
  const createContext = (inputs: Record<string, unknown>): NodeContext => ({
    nodeId: "[node-id]",
    inputs,
    getIntegration: async () => { throw new Error("No integrations in test"); },
    env: {},
  } as unknown as NodeContext);

  it("should [perform expected operation]", async () => {
    const node = new [NodeClassName]Node({ nodeId: "[node-id]" } as unknown as Node);
    const result = await node.execute(createContext({ input1: "test value" }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.output1).toBe("expected value");
  });

  it("should handle empty input", async () => {
    const node = new [NodeClassName]Node({ nodeId: "[node-id]" } as unknown as Node);
    const result = await node.execute(createContext({ input1: "" }));

    expect(result.status).toBe("completed");
  });

  it("should return error for missing input", async () => {
    const node = new [NodeClassName]Node({ nodeId: "[node-id]" } as unknown as Node);
    const result = await node.execute(createContext({}));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Missing required input");
  });

  it("should return error for invalid type", async () => {
    const node = new [NodeClassName]Node({ nodeId: "[node-id]" } as unknown as Node);
    const result = await node.execute(createContext({ input1: 123 }));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Invalid input type");
  });

  it("should handle array of inputs", async () => {
    const node = new [NodeClassName]Node({ nodeId: "[node-id]" } as unknown as Node);
    const result = await node.execute(createContext({ input1: ["val1", "val2"] }));

    expect(result.status).toBe("completed");
  });

  it("should return error for invalid element in array", async () => {
    const node = new [NodeClassName]Node({ nodeId: "[node-id]" } as unknown as Node);
    const result = await node.execute(createContext({ input1: ["valid", 123] }));

    expect(result.status).toBe("error");
    expect(result.error).toContain("position 1");
  });
});
```

**Test coverage:** Happy path, edge cases (empty/boundary values), error cases (missing/wrong types), array handling, type coercion (if applicable), domain-specific cases.

## Step 4: Register the Node

**File:** `apps/api/src/nodes/cloudflare-node-registry.ts`

Add import (alphabetically within category):
```typescript
import { [NodeClassName]Node } from "./<category>/<node-id>";
```

Register in constructor (alphabetically within category):
```typescript
this.registerImplementation([NodeClassName]Node);
```

## Step 5: Run Tests

```bash
pnpm typecheck
pnpm --filter '@dafthunk/api' test <node-id>
```

## Step 6: Summary

List files created, confirm registry registration, show test command, note any dependencies to install.

## Common Patterns

**Repeated inputs (single value or array):**
```typescript
if (typeof values === "string") { /* handle single */ }
if (Array.isArray(values)) { /* validate each element */ }
```

**Number coercion:**
```typescript
const num = Number(input);
if (isNaN(num)) { return this.createErrorResult("Invalid number"); }
```

**Optional inputs:**
```typescript
const { required, optional = "default" } = context.inputs;
```

**External libraries:**
```typescript
try {
  const result = library.function(input);
} catch (err) {
  return this.createErrorResult(`Operation failed: ${(err as Error).message}`);
}
```
