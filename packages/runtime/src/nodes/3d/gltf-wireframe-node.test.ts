import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { beforeAll, describe, expect, it } from "vitest";
import { CsgCubeNode } from "./csg-cube-node";
import { GltfWireframeNode } from "./gltf-wireframe-node";

describe("GltfWireframeNode", () => {
  const nodeId = "gltf-wireframe";
  const node = new GltfWireframeNode({ nodeId } as unknown as Node);

  const createContext = (
    id: string,
    inputs: Record<string, unknown>
  ): NodeContext =>
    ({
      nodeId: id,
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    }) as unknown as NodeContext;

  let cube: { data: Uint8Array; mimeType: string };

  beforeAll(async () => {
    const result = await new CsgCubeNode({
      nodeId: "csg-cube",
    } as unknown as Node).execute(createContext("csg-cube", { size: 2 }));

    expect(result.status).toBe("completed");
    cube = result.outputs?.mesh as { data: Uint8Array; mimeType: string };
  });

  it("returns a GLB model with wireframe edges", async () => {
    const result = await node.execute(createContext(nodeId, { gltf: cube }));

    expect(result.status).toBe("completed");
    const gltf = result.outputs?.gltf as { data: Uint8Array; mimeType: string };
    expect(gltf.mimeType).toBe("model/gltf-binary");
    expect(gltf.data.byteLength).toBeGreaterThan(0);
  });

  it("accepts an explicit line colour and width", async () => {
    const result = await node.execute(
      createContext(nodeId, {
        gltf: cube,
        lineColor: [1, 0, 0],
        lineWidth: 2,
      })
    );

    expect(result.status).toBe("completed");
  });

  it("rejects a colour component outside 0..1", async () => {
    const result = await node.execute(
      createContext(nodeId, { gltf: cube, lineColor: [2, 0, 0] })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Validation error");
  });

  it("rejects a non-positive line width", async () => {
    const result = await node.execute(
      createContext(nodeId, { gltf: cube, lineWidth: 0 })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Validation error");
  });

  it("rejects a missing model", async () => {
    const result = await node.execute(createContext(nodeId, {}));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Validation error");
  });

  it("reports a parse failure against this node", async () => {
    const result = await node.execute(
      createContext(nodeId, {
        gltf: {
          data: new Uint8Array([1, 2, 3]),
          mimeType: "model/gltf-binary",
        },
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Failed to add wireframe");
  });
});
