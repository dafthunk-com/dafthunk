import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { CsgSphereNode } from "./csg-sphere-node";

describe("CsgSphereNode", () => {
  const nodeId = "csg-sphere";
  const node = new CsgSphereNode({ nodeId } as unknown as Node);

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
    const result = await node.execute(createContext({ radius: 1 }));

    expect(result.status).toBe("completed");
    const mesh = result.outputs?.mesh as {
      data: Uint8Array;
      mimeType: string;
    };
    expect(mesh.mimeType).toBe("model/gltf-binary");
    expect(mesh.data.byteLength).toBeGreaterThan(0);
  });

  it("reports vertex and triangle counts", async () => {
    const result = await node.execute(createContext({ radius: 1 }));

    const metadata = result.outputs?.metadata as {
      vertexCount: number;
      triangleCount: number;
    };
    expect(metadata.vertexCount).toBeGreaterThan(0);
    expect(metadata.triangleCount).toBeGreaterThan(0);
  });

  it("produces more geometry at a higher segment count", async () => {
    const coarse = await node.execute(
      createContext({ radius: 1, widthSegments: 8, heightSegments: 6 })
    );
    const fine = await node.execute(
      createContext({ radius: 1, widthSegments: 32, heightSegments: 24 })
    );

    expect(triangles(fine)).toBeGreaterThan(triangles(coarse));
  });

  it("rejects a segment count below the minimum", async () => {
    const result = await node.execute(
      createContext({ radius: 1, widthSegments: 2 })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Width segments must be at least 3");
  });

  it("rejects an invalid dimension", async () => {
    const result = await node.execute(createContext({ radius: -1 }));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Radius must be positive");
  });

  it("rejects missing required inputs", async () => {
    const result = await node.execute(createContext({}));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Validation error");
  });
});
