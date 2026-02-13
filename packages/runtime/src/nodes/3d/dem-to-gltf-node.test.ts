import type { NodeContext } from "@dafthunk/runtime";
import { describe, expect, it } from "vitest";
import { DemToGltfNode } from "./dem-to-gltf-node";

// Helper to create mock NodeContext
const createMockContext = (inputs: Record<string, any>): NodeContext => ({
  nodeId: "test-node",
  workflowId: "test-workflow",
  organizationId: "test-org",
  mode: "dev",
  inputs,
  getIntegration: async () => {
    throw new Error("No integrations in test");
  },
  env: {} as any,
});

// Helper to create minimal valid 1x1 PNG (8 bytes RGBA)
const createTestPngImage = (): Uint8Array => {
  // Minimal PNG with 1x1 white pixel
  return new Uint8Array([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a, // PNG signature
    0x00,
    0x00,
    0x00,
    0x0d, // IHDR chunk length
    0x49,
    0x48,
    0x44,
    0x52, // IHDR
    0x00,
    0x00,
    0x00,
    0x01, // Width: 1
    0x00,
    0x00,
    0x00,
    0x01, // Height: 1
    0x08,
    0x06,
    0x00,
    0x00,
    0x00, // Bit depth: 8, Color type: 6 (RGBA)
    0x1f,
    0x15,
    0xc4,
    0x89, // CRC
    0x00,
    0x00,
    0x00,
    0x0d, // IDAT chunk length
    0x49,
    0x44,
    0x41,
    0x54, // IDAT
    0x08,
    0xd7,
    0x63,
    0xf8,
    0xcf,
    0xc0,
    0x00,
    0x00,
    0x00,
    0x03,
    0x00,
    0x01, // Compressed data (white pixel)
    0x8f,
    0x0a,
    0x02,
    0x8e, // CRC
    0x00,
    0x00,
    0x00,
    0x00, // IEND chunk length
    0x49,
    0x45,
    0x4e,
    0x44, // IEND
    0xae,
    0x42,
    0x60,
    0x82, // CRC
  ]);
};

// Helper to create DEM PNG with terrain RGB encoding
const createTestDemPng = (): Uint8Array => {
  // For testing, we'll use a simple 2x2 DEM with varying elevations
  // Mapbox Terrain-RGB: height = -10000 + ((R * 256 * 256 + G * 256 + B) * 0.1)
  // For elevation 100m: (100 + 10000) / 0.1 = 101000
  // R = 101000 / 65536 = 1, G = (101000 % 65536) / 256 = 138, B = 101000 % 256 = 168

  return new Uint8Array([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a, // PNG signature
    0x00,
    0x00,
    0x00,
    0x0d, // IHDR chunk length
    0x49,
    0x48,
    0x44,
    0x52, // IHDR
    0x00,
    0x00,
    0x00,
    0x02, // Width: 2
    0x00,
    0x00,
    0x00,
    0x02, // Height: 2
    0x08,
    0x02,
    0x00,
    0x00,
    0x00, // Bit depth: 8, Color type: 2 (RGB)
    0xfd,
    0xd4,
    0x9a,
    0x73, // CRC
    0x00,
    0x00,
    0x00,
    0x16, // IDAT chunk length (22 bytes)
    0x49,
    0x44,
    0x41,
    0x54, // IDAT
    // Compressed RGB data for 2x2 pixels with elevation data
    0x08,
    0xd7,
    0x63,
    0x64,
    0x62,
    0x66,
    0x61,
    0x65,
    0x63,
    0x67,
    0xf8,
    0xcf,
    0xc0,
    0x00,
    0x00,
    0x00,
    0x00,
    0x0c,
    0x00,
    0x0d,
    0x5c,
    0x8f,
    0x4a,
    0x3e, // CRC
    0x00,
    0x00,
    0x00,
    0x00, // IEND chunk length
    0x49,
    0x45,
    0x4e,
    0x44, // IEND
    0xae,
    0x42,
    0x60,
    0x82, // CRC
  ]);
};

// Helper to create texture PNG
const createTestTexturePng = (): Uint8Array => {
  return createTestPngImage();
};

describe("DemToGltfNode", () => {
  const node = new DemToGltfNode({} as any);

  describe("NodeType Definition", () => {
    it("should have correct static configuration", () => {
      const nodeType = DemToGltfNode.nodeType;

      expect(nodeType.id).toBe("dem-to-gltf");
      expect(nodeType.name).toBe("DEM to glTF");
      expect(nodeType.type).toBe("dem-to-gltf");
      expect(nodeType.tags).toContain("3D");
      expect(nodeType.tags).toContain("DEM");
      expect(nodeType.tags).toContain("GLTF");

      // Verify inputs
      expect(nodeType.inputs).toHaveLength(5);
      expect(nodeType.inputs[0].name).toBe("image");
      expect(nodeType.inputs[0].type).toBe("image");
      expect(nodeType.inputs[0].required).toBe(true);
      expect(nodeType.inputs[1].name).toBe("bounds");
      expect(nodeType.inputs[1].type).toBe("json");
      expect(nodeType.inputs[1].required).toBe(true);
      expect(nodeType.inputs[2].name).toBe("martiniError");
      expect(nodeType.inputs[2].required).toBe(false);
      expect(nodeType.inputs[3].name).toBe("texture");
      expect(nodeType.inputs[3].type).toBe("image");
      expect(nodeType.inputs[3].required).toBe(false);
      expect(nodeType.inputs[4].name).toBe("materialProperties");
      expect(nodeType.inputs[4].type).toBe("json");
      expect(nodeType.inputs[4].required).toBe(false);
      expect(nodeType.inputs[4].hidden).toBe(true);

      // Verify outputs
      expect(nodeType.outputs).toHaveLength(2);
      expect(nodeType.outputs[0].name).toBe("gltf");
      expect(nodeType.outputs[0].type).toBe("gltf");
      expect(nodeType.outputs[1].name).toBe("metadata");
      expect(nodeType.outputs[1].type).toBe("json");
    });
  });

  describe("Basic DEM to GLTF Conversion (without material)", () => {
    // TODO: Need realistic DEM PNG fixture for success path tests
    it.skip("should convert DEM to GLTF successfully", async () => {
      const context = createMockContext({
        image: {
          data: createTestDemPng(),
          mimeType: "image/png",
        },
        bounds: [-180, -90, 180, 90],
        martiniError: 1,
      });

      const result = await node.execute(context);

      // Log error if test fails for debugging
      if (result.status === "error") {
        console.log("Error:", result.error);
      }

      expect(result.status).toBe("completed");
      expect(result.outputs).toBeDefined();
      expect(result.outputs!.gltf).toBeDefined();
      expect(result.outputs!.gltf.data).toBeInstanceOf(Uint8Array);
      expect(result.outputs!.gltf.mimeType).toBe("model/gltf-binary");

      // Verify GLB magic number (0x46546C67 = "glTF")
      const glbData = result.outputs!.gltf.data;
      expect(glbData[0]).toBe(0x67);
      expect(glbData[1]).toBe(0x6c);
      expect(glbData[2]).toBe(0x54);
      expect(glbData[3]).toBe(0x46);

      // Verify metadata
      expect(result.outputs!.metadata).toBeDefined();
      expect(result.outputs!.metadata.vertexCount).toBeGreaterThan(0);
      expect(result.outputs!.metadata.triangleCount).toBeGreaterThan(0);
      expect(result.outputs!.metadata.hasTexture).toBe(false);
      expect(result.outputs!.metadata.hasMaterial).toBe(false);
    });

    it.skip("should use default martiniError when not provided", async () => {
      const context = createMockContext({
        image: {
          data: createTestDemPng(),
          mimeType: "image/png",
        },
        bounds: [-180, -90, 180, 90],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs).toBeDefined();
    });
  });

  describe("DEM to GLTF with Texture", () => {
    it.skip("should apply texture when provided", async () => {
      const context = createMockContext({
        image: {
          data: createTestDemPng(),
          mimeType: "image/png",
        },
        bounds: [-180, -90, 180, 90],
        martiniError: 1,
        texture: {
          data: createTestTexturePng(),
          mimeType: "image/png",
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs).toBeDefined();
      expect(result.outputs!.gltf).toBeDefined();
      expect(result.outputs!.gltf.data).toBeInstanceOf(Uint8Array);
      expect(result.outputs!.gltf.mimeType).toBe("model/gltf-binary");

      // Verify metadata shows texture was applied
      expect(result.outputs!.metadata.hasTexture).toBe(true);
      expect(result.outputs!.metadata.hasMaterial).toBe(true);
    });
  });

  describe("DEM to GLTF with Material Properties", () => {
    it.skip("should apply custom material properties", async () => {
      const context = createMockContext({
        image: {
          data: createTestDemPng(),
          mimeType: "image/png",
        },
        bounds: [-180, -90, 180, 90],
        martiniError: 1,
        materialProperties: {
          baseColorFactor: [1.0, 0.5, 0.5, 1.0],
          metallicFactor: 0.5,
          roughnessFactor: 0.3,
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs).toBeDefined();
      expect(result.outputs!.gltf).toBeDefined();

      // Verify metadata shows material was applied
      expect(result.outputs!.metadata.hasTexture).toBe(false);
      expect(result.outputs!.metadata.hasMaterial).toBe(true);
    });
  });

  describe("DEM to GLTF with Both Texture and Material Properties", () => {
    it.skip("should apply both texture and material properties", async () => {
      const context = createMockContext({
        image: {
          data: createTestDemPng(),
          mimeType: "image/png",
        },
        bounds: [-180, -90, 180, 90],
        martiniError: 1,
        texture: {
          data: createTestTexturePng(),
          mimeType: "image/png",
        },
        materialProperties: {
          metallicFactor: 0.2,
          roughnessFactor: 0.9,
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs).toBeDefined();
      expect(result.outputs!.gltf).toBeDefined();

      // Verify metadata shows both were applied
      expect(result.outputs!.metadata.hasTexture).toBe(true);
      expect(result.outputs!.metadata.hasMaterial).toBe(true);
    });
  });

  describe("Input Validation", () => {
    it("should fail with missing required image input", async () => {
      const context = createMockContext({
        bounds: [-180, -90, 180, 90],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toContain("DEM to glTF conversion failed");
    });

    it("should fail with missing required bounds input", async () => {
      const context = createMockContext({
        image: {
          data: createTestDemPng(),
          mimeType: "image/png",
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toContain("DEM to glTF conversion failed");
    });

    it("should fail with invalid bounds format", async () => {
      const context = createMockContext({
        image: {
          data: createTestDemPng(),
          mimeType: "image/png",
        },
        bounds: [1, 2], // Should be 4 elements
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toContain("DEM to glTF conversion failed");
    });

    it("should fail with invalid martiniError range (too low)", async () => {
      const context = createMockContext({
        image: {
          data: createTestDemPng(),
          mimeType: "image/png",
        },
        bounds: [-180, -90, 180, 90],
        martiniError: 0.05, // Below minimum of 0.1
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toContain("DEM to glTF conversion failed");
    });

    it("should fail with invalid martiniError range (too high)", async () => {
      const context = createMockContext({
        image: {
          data: createTestDemPng(),
          mimeType: "image/png",
        },
        bounds: [-180, -90, 180, 90],
        martiniError: 150, // Above maximum of 100
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toContain("DEM to glTF conversion failed");
    });

    it("should fail with invalid texture MIME type", async () => {
      const context = createMockContext({
        image: {
          data: createTestDemPng(),
          mimeType: "image/png",
        },
        bounds: [-180, -90, 180, 90],
        texture: {
          data: createTestTexturePng(),
          mimeType: "image/jpeg", // Should be image/png
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toContain("DEM to glTF conversion failed");
    });

    it("should fail with invalid materialProperties type", async () => {
      const context = createMockContext({
        image: {
          data: createTestDemPng(),
          mimeType: "image/png",
        },
        bounds: [-180, -90, 180, 90],
        materialProperties: "not an object", // Should be object
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toContain("DEM to glTF conversion failed");
    });

    it("should fail with invalid metallicFactor range", async () => {
      const context = createMockContext({
        image: {
          data: createTestDemPng(),
          mimeType: "image/png",
        },
        bounds: [-180, -90, 180, 90],
        materialProperties: {
          metallicFactor: 1.5, // Should be 0-1
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toContain("DEM to glTF conversion failed");
    });

    it("should fail with invalid roughnessFactor range", async () => {
      const context = createMockContext({
        image: {
          data: createTestDemPng(),
          mimeType: "image/png",
        },
        bounds: [-180, -90, 180, 90],
        materialProperties: {
          roughnessFactor: -0.1, // Should be 0-1
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toContain("DEM to glTF conversion failed");
    });

    it("should fail with invalid baseColorFactor length", async () => {
      const context = createMockContext({
        image: {
          data: createTestDemPng(),
          mimeType: "image/png",
        },
        bounds: [-180, -90, 180, 90],
        materialProperties: {
          baseColorFactor: [1.0, 0.5, 0.5], // Should be 4 elements
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toContain("DEM to glTF conversion failed");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty inputs object", async () => {
      const context = createMockContext({});

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBeDefined();
    });

    it("should handle invalid image data", async () => {
      const context = createMockContext({
        image: {
          data: new Uint8Array([0, 1, 2, 3]), // Invalid PNG
          mimeType: "image/png",
        },
        bounds: [-180, -90, 180, 90],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toContain("DEM to glTF conversion failed");
    });
  });
});
