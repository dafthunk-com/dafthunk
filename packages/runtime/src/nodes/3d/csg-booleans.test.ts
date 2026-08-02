import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { beforeAll, describe, expect, it } from "vitest";
import { CsgCubeNode } from "./csg-cube-node";
import { CsgDifferenceNode } from "./csg-difference-node";
import { CsgIntersectionNode } from "./csg-intersection-node";
import { CsgSphereNode } from "./csg-sphere-node";
import { CsgUnionNode } from "./csg-union-node";
import { CsgXorNode } from "./csg-xor-node";

/**
 * The boolean nodes consume real GLB meshes, so these specs build two
 * overlapping primitives first and run every operation over the same pair.
 */
describe("CSG boolean nodes", () => {
  const createContext = (
    nodeId: string,
    inputs: Record<string, unknown>
  ): NodeContext =>
    ({
      nodeId,
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
    }) as unknown as NodeContext;

  const meshOf = (result: { outputs?: Record<string, unknown> }) =>
    result.outputs?.mesh as { data: Uint8Array; mimeType: string };

  let cube: { data: Uint8Array; mimeType: string };
  let sphere: { data: Uint8Array; mimeType: string };

  beforeAll(async () => {
    const cubeResult = await new CsgCubeNode({
      nodeId: "csg-cube",
    } as unknown as Node).execute(
      createContext("csg-cube", { size: 2, center: true })
    );
    const sphereResult = await new CsgSphereNode({
      nodeId: "csg-sphere",
    } as unknown as Node).execute(
      createContext("csg-sphere", {
        radius: 1.2,
        widthSegments: 16,
        heightSegments: 12,
      })
    );

    expect(cubeResult.status).toBe("completed");
    expect(sphereResult.status).toBe("completed");
    cube = meshOf(cubeResult);
    sphere = meshOf(sphereResult);
  });

  const OPERATIONS = [
    ["CsgUnionNode", CsgUnionNode, "csg-union", "union"],
    ["CsgDifferenceNode", CsgDifferenceNode, "csg-difference", "difference"],
    [
      "CsgIntersectionNode",
      CsgIntersectionNode,
      "csg-intersection",
      "intersection",
    ],
    ["CsgXorNode", CsgXorNode, "csg-xor", "xor"],
  ] as const;

  for (const [name, NodeClass, id, operation] of OPERATIONS) {
    describe(name, () => {
      const node = new NodeClass({ nodeId: id } as unknown as Node);

      it("combines two meshes into a GLB result", async () => {
        const result = await node.execute(
          createContext(id, { meshA: cube, meshB: sphere })
        );

        expect(result.status).toBe("completed");
        expect(meshOf(result).mimeType).toBe("model/gltf-binary");
        expect(meshOf(result).data.byteLength).toBeGreaterThan(0);
      });

      it("labels the result with its operation", async () => {
        const result = await node.execute(
          createContext(id, { meshA: cube, meshB: sphere })
        );

        expect(result.outputs?.metadata).toMatchObject({ operation });
      });

      it("accepts raw Uint8Array meshes", async () => {
        const result = await node.execute(
          createContext(id, { meshA: cube.data, meshB: sphere.data })
        );

        expect(result.status).toBe("completed");
      });

      it("rejects a missing second operand", async () => {
        const result = await node.execute(createContext(id, { meshA: cube }));

        expect(result.status).toBe("error");
        expect(result.error).toContain("Validation error");
      });

      it("rejects a mesh that is not GLB data", async () => {
        const result = await node.execute(
          createContext(id, {
            meshA: cube,
            meshB: { data: new Uint8Array([1, 2, 3]) },
          })
        );

        expect(result.status).toBe("error");
      });
    });
  }
});
