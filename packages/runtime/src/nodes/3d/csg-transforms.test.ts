import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { beforeAll, describe, expect, it } from "vitest";
import { CsgApplyMaterialNode } from "./csg-apply-material-node";
import { CsgCubeNode } from "./csg-cube-node";
import { CsgRotateNode } from "./csg-rotate-node";
import { CsgScaleNode } from "./csg-scale-node";
import { CsgTranslateNode } from "./csg-translate-node";

/**
 * The transform nodes round-trip real GLB data, so these specs build a cube
 * with the primitive node first and feed its output through each transform.
 */
describe("CSG transform nodes", () => {
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

  const statsOf = (result: { outputs?: Record<string, unknown> }) =>
    result.outputs?.metadata as {
      vertexCount: number;
      triangleCount: number;
    };

  let cube: { data: Uint8Array; mimeType: string };

  beforeAll(async () => {
    const cubeNode = new CsgCubeNode({ nodeId: "csg-cube" } as unknown as Node);
    const result = await cubeNode.execute(
      createContext("csg-cube", { size: 2 })
    );
    expect(result.status).toBe("completed");
    cube = meshOf(result);
  });

  describe("CsgScaleNode", () => {
    const node = new CsgScaleNode({ nodeId: "csg-scale" } as unknown as Node);

    it("scales a mesh uniformly and keeps its topology", async () => {
      const result = await node.execute(
        createContext("csg-scale", { mesh: cube, scale: 2 })
      );

      expect(result.status).toBe("completed");
      expect(meshOf(result).mimeType).toBe("model/gltf-binary");
      expect(statsOf(result).triangleCount).toBeGreaterThan(0);
    });

    it("accepts a per-axis scale", async () => {
      const result = await node.execute(
        createContext("csg-scale", { mesh: cube, scale: [1, 2, 3] })
      );

      expect(result.status).toBe("completed");
      expect(meshOf(result).data.byteLength).toBeGreaterThan(0);
    });

    it("accepts a raw Uint8Array as the mesh", async () => {
      const result = await node.execute(
        createContext("csg-scale", { mesh: cube.data, scale: 2 })
      );

      expect(result.status).toBe("completed");
    });

    it("rejects a non-positive scale", async () => {
      const result = await node.execute(
        createContext("csg-scale", { mesh: cube, scale: 0 })
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("Scale must be positive");
    });

    it("rejects a missing mesh", async () => {
      const result = await node.execute(
        createContext("csg-scale", { scale: 2 })
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("Validation error");
    });
  });

  describe("CsgTranslateNode", () => {
    const node = new CsgTranslateNode({
      nodeId: "csg-translate",
    } as unknown as Node);

    it("translates a mesh by an offset", async () => {
      const result = await node.execute(
        createContext("csg-translate", { mesh: cube, offset: [1, 0, -1] })
      );

      expect(result.status).toBe("completed");
      expect(meshOf(result).mimeType).toBe("model/gltf-binary");
    });

    it("rejects an offset that is not a triple", async () => {
      const result = await node.execute(
        createContext("csg-translate", { mesh: cube, offset: [1, 0] })
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("Validation error");
    });
  });

  describe("CsgRotateNode", () => {
    const node = new CsgRotateNode({ nodeId: "csg-rotate" } as unknown as Node);

    it("rotates a mesh by degrees per axis", async () => {
      const result = await node.execute(
        createContext("csg-rotate", { mesh: cube, rotation: [0, 90, 0] })
      );

      expect(result.status).toBe("completed");
      expect(statsOf(result).vertexCount).toBeGreaterThan(0);
    });

    it("rejects a missing rotation", async () => {
      const result = await node.execute(
        createContext("csg-rotate", { mesh: cube })
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("Validation error");
    });
  });

  describe("CsgApplyMaterialNode", () => {
    const node = new CsgApplyMaterialNode({
      nodeId: "csg-apply-material",
    } as unknown as Node);

    it("applies a PBR material to a mesh", async () => {
      const result = await node.execute(
        createContext("csg-apply-material", {
          mesh: cube,
          color: "#FF0000",
          metallic: 1,
          roughness: 0.2,
        })
      );

      expect(result.status).toBe("completed");
      expect(meshOf(result).mimeType).toBe("model/gltf-binary");
    });

    it("falls back to defaults when only a mesh is given", async () => {
      const result = await node.execute(
        createContext("csg-apply-material", { mesh: cube })
      );

      expect(result.status).toBe("completed");
    });

    it("rejects a colour that is not a hex triplet", async () => {
      const result = await node.execute(
        createContext("csg-apply-material", { mesh: cube, color: "red" })
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("Color must be a hex color");
    });

    it("rejects a metallic factor outside 0..1", async () => {
      const result = await node.execute(
        createContext("csg-apply-material", { mesh: cube, metallic: 2 })
      );

      expect(result.status).toBe("error");
      expect(result.error).toContain("Validation error");
    });
  });
});
