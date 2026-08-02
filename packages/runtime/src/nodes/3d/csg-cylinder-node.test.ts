import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { CsgCylinderNode } from "./csg-cylinder-node";

describe("CsgCylinderNode", () => {
  const nodeId = "csg-cylinder";
  const node = new CsgCylinderNode({ nodeId } as unknown as Node);

  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId,
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    }) as unknown as NodeContext;

  const triangles = (result: { outputs?: Record<string, unknown> }) =>
    (result.outputs?.metadata as { triangleCount: number }).triangleCount;

  it("emits a GLB mesh", async () => {
    const result = await node.execute(
      createContext({ height: 2, radiusBottom: 1 })
    );

    expect(result.status).toBe("completed");
    const mesh = result.outputs?.mesh as {
      data: Uint8Array;
      mimeType: string;
    };
    expect(mesh.mimeType).toBe("model/gltf-binary");
    expect(mesh.data.byteLength).toBeGreaterThan(0);
  });

  it("reports vertex and triangle counts", async () => {
    const result = await node.execute(
      createContext({ height: 2, radiusBottom: 1 })
    );

    const metadata = result.outputs?.metadata as {
      vertexCount: number;
      triangleCount: number;
    };
    expect(metadata.vertexCount).toBeGreaterThan(0);
    expect(metadata.triangleCount).toBeGreaterThan(0);
  });

  it("accepts a distinct top radius, producing a frustum", async () => {
    const result = await node.execute(
      createContext({ height: 2, radiusBottom: 1, radiusTop: 0.5 })
    );

    expect(result.status).toBe("completed");
    expect(triangles(result)).toBeGreaterThan(0);
  });

  it("rejects an invalid dimension", async () => {
    const result = await node.execute(
      createContext({ height: 2, radiusBottom: 0 })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Bottom radius must be positive");
  });

  it("rejects missing required inputs", async () => {
    const result = await node.execute(createContext({}));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Validation error");
  });
});
