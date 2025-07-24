import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { StringToLowerCaseNode } from "./string-to-lower-case-node";

describe("StringToLowerCaseNode", () => {
  it("should convert string to lowercase", async () => {
    const nodeId = "string-to-lower-case";
    const node = new StringToLowerCaseNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        string: "Hello World",
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toBe("hello world");
  });

  it("should handle already lowercase string", async () => {
    const nodeId = "string-to-lower-case";
    const node = new StringToLowerCaseNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        string: "hello world",
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("hello world");
  });

  it("should handle empty string", async () => {
    const nodeId = "string-to-lower-case";
    const node = new StringToLowerCaseNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        string: "",
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("");
  });
});
