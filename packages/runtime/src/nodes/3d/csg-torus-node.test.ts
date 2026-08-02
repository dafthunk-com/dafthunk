import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { CsgTorusNode } from "./csg-torus-node";

describe("CsgTorusNode", () => {
  const nodeId = "csg-torus";
  const node = new CsgTorusNode({ nodeId } as unknown as Node);

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
      createContext({ radius: 1, tubeRadius: 0.3 })
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
      createContext({ radius: 1, tubeRadius: 0.3 })
    );

    const metadata = result.outputs?.metadata as {
      vertexCount: number;
      triangleCount: number;
    };
    expect(metadata.vertexCount).toBeGreaterThan(0);
    expect(metadata.triangleCount).toBeGreaterThan(0);
  });

  it("rejects an invalid dimension", async () => {
    const result = await node.execute(
      createContext({ radius: 1, tubeRadius: -1 })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Tube radius must be positive");
  });

  it("falls back to default dimensions when given no inputs", async () => {
    const result = await node.execute(createContext({}));

    expect(result.status).toBe("completed");
    expect(triangles(result)).toBeGreaterThan(0);
  });
});
