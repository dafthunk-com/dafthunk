import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { ImageOutputNode } from "./image-output-node";

describe("ImageOutputNode", () => {
  const nodeId = "output-image";
  const node = new ImageOutputNode({ nodeId } as unknown as Node);

  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId,
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    }) as unknown as NodeContext;

  const blob = { data: new Uint8Array([1, 2, 3]), mimeType: "image/png" };

  it("passes the blob through for display", async () => {
    const result = await node.execute(createContext({ value: blob }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.displayValue).toEqual(blob);
  });

  it("accepts an absent value", async () => {
    const result = await node.execute(createContext({}));

    expect(result.status).toBe("completed");
    expect(result.outputs?.displayValue).toBeUndefined();
  });

  it("errors when data is not a Uint8Array", async () => {
    const result = await node.execute(
      createContext({ value: { data: "not-bytes", mimeType: "image/png" } })
    );

    expect(result.status).toBe("error");
    expect(result.error).toBe(
      "Value must be a valid image with data and mimeType"
    );
  });

  it("errors when mimeType is missing", async () => {
    const result = await node.execute(
      createContext({ value: { data: new Uint8Array([1]) } })
    );

    expect(result.status).toBe("error");
    expect(result.error).toBe(
      "Value must be a valid image with data and mimeType"
    );
  });

  it("errors on a MIME type from another family", async () => {
    const result = await node.execute(
      createContext({
        value: { data: new Uint8Array([1]), mimeType: "audio/wav" },
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toBe(
      "MIME type must be image-related (e.g., image/png, image/jpeg)"
    );
  });
});
