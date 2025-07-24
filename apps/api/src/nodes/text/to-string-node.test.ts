import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { ToStringNode } from "./to-string-node";

describe("ToStringNode", () => {
  it("should convert number to string", async () => {
    const nodeId = "to-string";
    const node = new ToStringNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        value: 123,
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe("123");
  });

  it("should convert boolean to string", async () => {
    const nodeId = "to-string";
    const node = new ToStringNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        value: true,
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("true");
  });

  it("should handle string input", async () => {
    const nodeId = "to-string";
    const node = new ToStringNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        value: "Hello World",
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("Hello World");
  });

  it("should handle object input", async () => {
    const nodeId = "to-string";
    const node = new ToStringNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        value: { name: "John", age: 30 },
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe('{"name":"John","age":30}');
  });

  it("should handle null input", async () => {
    const nodeId = "to-string";
    const node = new ToStringNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        value: null,
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("null");
  });

  it("should handle undefined input", async () => {
    const nodeId = "to-string";
    const node = new ToStringNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        value: undefined,
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("undefined");
  });
});
