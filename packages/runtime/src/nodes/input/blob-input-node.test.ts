import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { BlobInputNode } from "./blob-input-node";

describe("BlobInputNode", () => {
  const nodeId = "blob-input";
  const node = new BlobInputNode({ nodeId } as unknown as Node);

  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId,
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    }) as unknown as NodeContext;

  const blob = {
    data: new Uint8Array([1, 2, 3]),
    mimeType: "application/octet-stream",
  };

  it("passes the provided value through", async () => {
    const result = await node.execute(createContext({ value: blob }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toEqual(blob);
  });

  it("errors when no value is provided", async () => {
    const result = await node.execute(createContext({}));

    expect(result.status).toBe("error");
    expect(result.error).toBe("No blob provided");
  });

  it("errors when the value is null", async () => {
    const result = await node.execute(createContext({ value: null }));

    expect(result.status).toBe("error");
    expect(result.error).toBe("No blob provided");
  });
});
