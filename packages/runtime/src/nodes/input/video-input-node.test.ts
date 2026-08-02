import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { VideoInputNode } from "./video-input-node";

describe("VideoInputNode", () => {
  const nodeId = "video-input";
  const node = new VideoInputNode({ nodeId } as unknown as Node);

  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId,
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    }) as unknown as NodeContext;

  const blob = { data: new Uint8Array([1, 2, 3]), mimeType: "video/mp4" };

  it("passes the provided value through", async () => {
    const result = await node.execute(createContext({ value: blob }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.value).toEqual(blob);
  });

  it("errors when no value is provided", async () => {
    const result = await node.execute(createContext({}));

    expect(result.status).toBe("error");
    expect(result.error).toBe("No video provided");
  });

  it("errors when the value is null", async () => {
    const result = await node.execute(createContext({ value: null }));

    expect(result.status).toBe("error");
    expect(result.error).toBe("No video provided");
  });
});
