import { Node } from "@dafthunk/types";
import { describe, it, expect } from "vitest";

import { NodeContext } from "../types";
import { JavascriptScriptNode } from "./javascript-script-node";

describe("JavascriptScriptNode", () => {
  it("should execute a simple script", async () => {
    const nodeId = "javascript-script";
    const node = new JavascriptScriptNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        script: "2 + 2",
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe(4);
    expect(result.outputs?.stdout).toBe("");
    expect(result.outputs?.stderr).toBe("");
    expect(result.outputs?.error).toBeNull();
  });

  it("should capture console.log output", async () => {
    const nodeId = "javascript-script";
    const node = new JavascriptScriptNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        script: `
          console.log("Hello, World!");
          "Script completed"
        `,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("Script completed");
    expect(result.outputs?.stdout).toBe("Hello, World!");
    expect(result.outputs?.stderr).toBe("");
    expect(result.outputs?.error).toBeNull();
  });

  it("should provide arguments as global args array", async () => {
    const nodeId = "javascript-script";
    const node = new JavascriptScriptNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        script: "args",
        args: ["arg1", "arg2"],
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual(["arg1", "arg2"]);
    expect(result.outputs?.error).toBeNull();
  });

  it("should work with args in a script", async () => {
    const nodeId = "javascript-script";
    const node = new JavascriptScriptNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        script: `
          console.log('Processing values:', args.join(', '));
          args.map(x => x.toUpperCase())
        `,
        args: ["hello", "world", "javascript"],
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual(["HELLO", "WORLD", "JAVASCRIPT"]);
    expect(result.outputs?.stdout).toBe("Processing values: hello, world, javascript");
    expect(result.outputs?.error).toBeNull();
  });

  it("should handle object literal return", async () => {
    const nodeId = "javascript-script";
    const node = new JavascriptScriptNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        script: "{ name: 'Alice', age: 30 }",
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual({ name: "Alice", age: 30 });
    expect(result.outputs?.error).toBeNull();
  });

  it("should handle missing script", async () => {
    const nodeId = "javascript-script";
    const node = new JavascriptScriptNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Missing or empty script.");
  });
});
