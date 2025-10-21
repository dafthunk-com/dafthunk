import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { AbsoluteValueNode } from "./absolute-value-node";

describe("AbsoluteValueNode", () => {
  it("should return absolute value of positive number", async () => {
    const nodeId = "absolute-value";
    const node = new AbsoluteValueNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        value: 5,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe(5);
  });

  it("should return absolute value of negative number", async () => {
    const nodeId = "absolute-value";
    const node = new AbsoluteValueNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        value: -7,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe(7);
  });

  it("should return zero for zero input", async () => {
    const nodeId = "absolute-value";
    const node = new AbsoluteValueNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        value: 0,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe(0);
  });

  it("should handle string input that can be converted to number", async () => {
    const nodeId = "absolute-value";
    const node = new AbsoluteValueNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        value: "-3.5",
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe(3.5);
  });

  it("should return error for invalid input", async () => {
    const nodeId = "absolute-value";
    const node = new AbsoluteValueNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        value: "invalid",
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Input must be a number");
  });

  it("should return error for missing value input", async () => {
    const nodeId = "absolute-value";
    const node = new AbsoluteValueNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Input 'value' is required");
  });
});
