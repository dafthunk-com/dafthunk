import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { StringToUpperCaseNode } from "./string-to-upper-case-node";

describe("StringToUpperCaseNode", () => {
  it("should convert string to uppercase", async () => {
    const nodeId = "string-to-upper-case";
    const node = new StringToUpperCaseNode({
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
    expect(result.outputs?.result).toBe("HELLO WORLD");
  });

  it("should handle already uppercase string", async () => {
    const nodeId = "string-to-upper-case";
    const node = new StringToUpperCaseNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        string: "HELLO WORLD",
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toBe("HELLO WORLD");
  });

  it("should handle empty string", async () => {
    const nodeId = "string-to-upper-case";
    const node = new StringToUpperCaseNode({
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
