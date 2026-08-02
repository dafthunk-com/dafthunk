import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { FileNode } from "./file-node";

describe("FileNode", () => {
  const nodeId = "file";
  const node = new FileNode({ nodeId } as unknown as Node);

  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId,
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    }) as unknown as NodeContext;

  it("passes the uploaded blob through", async () => {
    const value = {
      data: new Uint8Array([1, 2, 3]),
      mimeType: "application/pdf",
    };
    const result = await node.execute(createContext({ value }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.file).toEqual(value);
  });

  it("errors when no file is provided", async () => {
    const result = await node.execute(createContext({}));

    expect(result.status).toBe("error");
    expect(result.error).toBe("No file data provided");
  });

  it("errors when the value is null", async () => {
    const result = await node.execute(createContext({ value: null }));

    expect(result.status).toBe("error");
    expect(result.error).toBe("No file data provided");
  });
});
