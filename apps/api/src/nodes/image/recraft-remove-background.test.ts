import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import type { NodeContext } from "@dafthunk/runtime";
import { RecraftRemoveBackgroundNode } from "./recraft-remove-background";

describe("RecraftRemoveBackgroundNode", () => {
  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId: "recraft-remove-background",
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    }) as unknown as NodeContext;

  it("should have correct nodeType metadata", () => {
    expect(RecraftRemoveBackgroundNode.nodeType.id).toBe(
      "recraft-remove-background"
    );
    expect(RecraftRemoveBackgroundNode.nodeType.name).toBe(
      "Remove Background (Recraft)"
    );
    expect(RecraftRemoveBackgroundNode.nodeType.inputs).toHaveLength(1);
    expect(RecraftRemoveBackgroundNode.nodeType.inputs[0].name).toBe("image");
    expect(RecraftRemoveBackgroundNode.nodeType.inputs[0].type).toBe("image");
    expect(RecraftRemoveBackgroundNode.nodeType.inputs[0].required).toBe(true);
    expect(RecraftRemoveBackgroundNode.nodeType.outputs).toHaveLength(1);
    expect(RecraftRemoveBackgroundNode.nodeType.outputs[0].name).toBe("image");
    expect(RecraftRemoveBackgroundNode.nodeType.outputs[0].type).toBe("image");
  });

  it("should return error for missing REPLICATE_API_TOKEN", async () => {
    const node = new RecraftRemoveBackgroundNode({
      nodeId: "recraft-remove-background",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        image: {
          data: new Uint8Array([137, 80, 78, 71]), // PNG magic bytes
          mimeType: "image/png",
        },
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("REPLICATE_API_TOKEN");
  });

  it("should return error for missing image input", async () => {
    const node = new RecraftRemoveBackgroundNode({
      nodeId: "recraft-remove-background",
    } as unknown as Node);
    const result = await node.execute(createContext({}));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Validation error");
  });

  it("should return error for invalid image input type", async () => {
    const node = new RecraftRemoveBackgroundNode({
      nodeId: "recraft-remove-background",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        image: "not-an-image-object",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Validation error");
  });

  it("should return error for image with missing data", async () => {
    const node = new RecraftRemoveBackgroundNode({
      nodeId: "recraft-remove-background",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        image: {
          mimeType: "image/png",
        },
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Validation error");
  });

  it("should return error for image with missing mimeType", async () => {
    const node = new RecraftRemoveBackgroundNode({
      nodeId: "recraft-remove-background",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        image: {
          data: new Uint8Array([137, 80, 78, 71]),
        },
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Validation error");
  });
});
