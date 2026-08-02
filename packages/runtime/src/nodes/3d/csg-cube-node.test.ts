import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { CsgCubeNode } from "./csg-cube-node";

describe("CsgCubeNode", () => {
  const nodeId = "csg-cube";
  const node = new CsgCubeNode({ nodeId } as unknown as Node);

  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId,
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    }) as unknown as NodeContext;

  const _triangles = (result: { outputs?: Record<string, unknown> }) =>
    (result.outputs?.metadata as { triangleCount: number }).triangleCount;

  it("emits a GLB mesh", async () => {
    const result = await node.execute(createContext({ size: 2 }));

    expect(result.status).toBe("completed");
    const mesh = result.outputs?.mesh as {
      data: Uint8Array;
      mimeType: string;
    };
    expect(mesh.mimeType).toBe("model/gltf-binary");
    expect(mesh.data.byteLength).toBeGreaterThan(0);
  });

  it("reports vertex and triangle counts", async () => {
    const result = await node.execute(createContext({ size: 2 }));

    const metadata = result.outputs?.metadata as {
      vertexCount: number;
      triangleCount: number;
    };
    expect(metadata.vertexCount).toBeGreaterThan(0);
    expect(metadata.triangleCount).toBeGreaterThan(0);
  });

  it("accepts a per-axis size", async () => {
    const result = await node.execute(createContext({ size: [1, 2, 3] }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.metadata).toMatchObject({
      dimensions: { x: 1, y: 2, z: 3 },
    });
  });

  it("records whether the cube was centred", async () => {
    const result = await node.execute(createContext({ size: 2, center: true }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.metadata).toMatchObject({ centered: true });
  });

  it("rejects an invalid dimension", async () => {
    const result = await node.execute(createContext({ size: 0 }));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Size must be positive");
  });

  it("rejects missing required inputs", async () => {
    const result = await node.execute(createContext({}));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Validation error");
  });
});
