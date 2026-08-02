import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { beforeAll, describe, expect, it } from "vitest";
import { CsgApplyTextureNode } from "./csg-apply-texture-node";
import { CsgCubeNode } from "./csg-cube-node";

// Smallest valid PNG: a 1x1 transparent pixel.
const PNG_1X1 = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06,
  0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44,
  0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0d,
  0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42,
  0x60, 0x82,
]);

describe("CsgApplyTextureNode", () => {
  const nodeId = "csg-apply-texture";
  const node = new CsgApplyTextureNode({ nodeId } as unknown as Node);

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

  const texture = { data: PNG_1X1, mimeType: "image/png" };

  let cube: { data: Uint8Array; mimeType: string };

  beforeAll(async () => {
    const result = await new CsgCubeNode({
      nodeId: "csg-cube",
    } as unknown as Node).execute(createContext("csg-cube", { size: 2 }));

    expect(result.status).toBe("completed");
    cube = result.outputs?.mesh as { data: Uint8Array; mimeType: string };
  });

  it("applies the texture and reports it in the metadata", async () => {
    const result = await node.execute(
      createContext(nodeId, { mesh: cube, texture })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.metadata).toMatchObject({
      textureApplied: true,
      textureSize: PNG_1X1.length,
      hasMaterialProperties: false,
    });
  });

  it("emits a GLB mesh", async () => {
    const result = await node.execute(
      createContext(nodeId, { mesh: cube, texture })
    );

    const mesh = result.outputs?.mesh as { data: Uint8Array; mimeType: string };
    expect(mesh.mimeType).toBe("model/gltf-binary");
    expect(mesh.data.byteLength).toBeGreaterThan(0);
  });

  it("records that material properties were supplied", async () => {
    const result = await node.execute(
      createContext(nodeId, {
        mesh: cube,
        texture,
        materialProperties: { metallicFactor: 1, roughnessFactor: 0.1 },
      })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.metadata).toMatchObject({
      hasMaterialProperties: true,
    });
  });

  it("rejects a texture that is not a PNG", async () => {
    const result = await node.execute(
      createContext(nodeId, {
        mesh: cube,
        texture: { data: PNG_1X1, mimeType: "image/jpeg" },
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Validation error");
  });

  it("rejects a missing texture", async () => {
    const result = await node.execute(createContext(nodeId, { mesh: cube }));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Validation error");
  });
});
