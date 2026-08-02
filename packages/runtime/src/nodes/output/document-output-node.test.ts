import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { DocumentOutputNode } from "./document-output-node";

describe("DocumentOutputNode", () => {
  const nodeId = "output-document";
  const node = new DocumentOutputNode({ nodeId } as unknown as Node);

  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId,
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    }) as unknown as NodeContext;

  const blob = { data: new Uint8Array([1, 2, 3]), mimeType: "application/pdf" };

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
      createContext({
        value: { data: "not-bytes", mimeType: "application/pdf" },
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toBe(
      "Value must be a valid document with data and mimeType"
    );
  });

  it("errors when mimeType is missing", async () => {
    const result = await node.execute(
      createContext({ value: { data: new Uint8Array([1]) } })
    );

    expect(result.status).toBe("error");
    expect(result.error).toBe(
      "Value must be a valid document with data and mimeType"
    );
  });
});
