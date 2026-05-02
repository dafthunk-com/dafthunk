import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { MockCodeModeExecutor } from "../../utils/mock-code-mode-executor";
import { JavascriptNode } from "./javascript-node";

function makeContext(inputs: Record<string, unknown>): NodeContext {
  return {
    nodeId: "javascript",
    inputs,
    codeModeExecutor: new MockCodeModeExecutor(),
    getIntegration: async () => {
      throw new Error("No integrations in test");
    },
  } as unknown as NodeContext;
}

describe("JavascriptNode", () => {
  it("should execute a simple script", async () => {
    const node = new JavascriptNode({
      nodeId: "javascript",
    } as unknown as Node);

    const result = await node.execute(makeContext({ script: "2 + 2" }));
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe(4);
    expect(result.outputs?.stdout).toBe("");
    expect(result.outputs?.stderr).toBe("");
    expect(result.outputs?.error).toBeNull();
  });

  it("should capture console.log output", async () => {
    const node = new JavascriptNode({
      nodeId: "javascript",
    } as unknown as Node);

    const result = await node.execute(
      makeContext({
        script: `
          console.log("Hello, World!");
          "Script completed"
        `,
      })
    );
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("Script completed");
    expect(result.outputs?.stdout).toBe("Hello, World!");
    expect(result.outputs?.stderr).toBe("");
    expect(result.outputs?.error).toBeNull();
  });

  it("should provide arguments as global args array", async () => {
    const node = new JavascriptNode({
      nodeId: "javascript",
    } as unknown as Node);

    const result = await node.execute(
      makeContext({ script: "args", args: ["arg1", "arg2"] })
    );
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual(["arg1", "arg2"]);
    expect(result.outputs?.error).toBeNull();
  });

  it("should work with args in a script", async () => {
    const node = new JavascriptNode({
      nodeId: "javascript",
    } as unknown as Node);

    const result = await node.execute(
      makeContext({
        script: `
          console.log('Processing values:', args.join(', '));
          args.map(x => x.toUpperCase())
        `,
        args: ["hello", "world", "javascript"],
      })
    );
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual(["HELLO", "WORLD", "JAVASCRIPT"]);
    expect(result.outputs?.stdout).toBe(
      "Processing values: hello, world, javascript"
    );
    expect(result.outputs?.error).toBeNull();
  });

  it("should handle object literal return", async () => {
    const node = new JavascriptNode({
      nodeId: "javascript",
    } as unknown as Node);

    const result = await node.execute(
      makeContext({ script: "{ name: 'Alice', age: 30 }" })
    );
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual({ name: "Alice", age: 30 });
    expect(result.outputs?.error).toBeNull();
  });

  it("should handle missing script", async () => {
    const node = new JavascriptNode({
      nodeId: "javascript",
    } as unknown as Node);

    const result = await node.execute(makeContext({}));
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing or empty script.");
  });

  it("should error when executor is unavailable", async () => {
    const node = new JavascriptNode({
      nodeId: "javascript",
    } as unknown as Node);

    const context = {
      nodeId: "javascript",
      inputs: { script: "1 + 1" },
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("executor unavailable");
  });

  it("should support explicit return statements", async () => {
    const node = new JavascriptNode({
      nodeId: "javascript",
    } as unknown as Node);

    const result = await node.execute(
      makeContext({
        script: "if (args[0] > 0) return 'pos'; return 'neg';",
        args: [5],
      })
    );
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("pos");
  });

  it("should enforce timeout", async () => {
    const node = new JavascriptNode({
      nodeId: "javascript",
    } as unknown as Node);

    const result = await node.execute(
      makeContext({
        script: "await new Promise(r => setTimeout(r, 1000)); return 1;",
        timeout: 50,
      })
    );
    expect(result.status).toBe("error");
    expect(result.error).toContain("timed out");
  });
});
