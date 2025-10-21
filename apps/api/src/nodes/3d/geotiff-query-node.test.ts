import { Node } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";

import { GeoTiffQueryNode } from "./geotiff-query-node";

// Mock the geotiff library and PNG encoder to avoid Node.js module imports
vi.mock("geotiff", () => ({
  fromUrl: vi.fn(),
}));

vi.mock("@cf-wasm/png", () => ({
  encode: vi.fn(),
}));

describe("GeoTiffQueryNode", () => {
  const node = new GeoTiffQueryNode({
    id: "test-node",
    name: "Test Node",
    type: "geotiff-query",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  } as unknown as Node);

  describe("execute", () => {
    it("should return error when URL is missing", async () => {
      const result = await node.execute({
        nodeId: "test-node",
        workflowId: "test-workflow",
        organizationId: "test-org",
        inputs: {
          bbox: [-10, -10, 10, 10],
          width: 256,
          height: 256,
        },
        env: {} as any,
      });

      expect(result.status).toBe("error");
      expect(result.error).toBe("URL is required and must be a string.");
    });

    it("should return error when bbox is invalid format", async () => {
      const result = await node.execute({
        nodeId: "test-node",
        workflowId: "test-workflow",
        organizationId: "test-org",
        inputs: {
          url: "https://example.com/test.tif",
          bbox: [-10, -10, 10], // Invalid: only 3 values
          width: 256,
          height: 256,
        },
        env: {} as any,
      });

      expect(result.status).toBe("error");
      expect(result.error).toBe(
        "Bbox must be an array of 4 numbers [minX, minY, maxX, maxY]."
      );
    });

    it("should return error when width or height are not numbers", async () => {
      const result = await node.execute({
        nodeId: "test-node",
        workflowId: "test-workflow",
        organizationId: "test-org",
        inputs: {
          url: "https://example.com/test.tif",
          bbox: [-10, -10, 10, 10],
          width: "256", // Invalid: string instead of number
          height: 256,
        },
        env: {} as any,
      });

      expect(result.status).toBe("error");
      expect(result.error).toBe("Width and height must be numbers.");
    });

    it("should handle geotiff processing errors gracefully", async () => {
      const { fromUrl } = await import("geotiff");
      vi.mocked(fromUrl).mockRejectedValueOnce(new Error("Network error"));

      const result = await node.execute({
        nodeId: "test-node",
        workflowId: "test-workflow",
        organizationId: "test-org",
        inputs: {
          url: "https://example.com/test.tif",
          bbox: [-10, -10, 10, 10],
          width: 256,
          height: 256,
        },
        env: {} as any,
      });

      expect(result.status).toBe("error");
      expect(result.error).toContain("GeoTIFF query failed");
    });

    it("should successfully query GeoTIFF with valid inputs", async () => {
      const { fromUrl } = await import("geotiff");
      const { encode } = await import("@cf-wasm/png");

      // Mock successful geotiff query
      const mockRasterData = new Float32Array([100, 200, 300, 400]);
      const mockImage = {
        getWidth: vi.fn().mockReturnValue(100),
        getHeight: vi.fn().mockReturnValue(100),
        getBoundingBox: vi.fn().mockReturnValue([-20, -20, 20, 20]),
        getSamplesPerPixel: vi.fn().mockReturnValue(1),
      };
      const mockTiff = {
        getImage: vi.fn().mockResolvedValue(mockImage),
        readRasters: vi.fn().mockResolvedValue([mockRasterData]),
      };

      vi.mocked(fromUrl).mockResolvedValue(mockTiff as any);
      vi.mocked(encode).mockReturnValue(new Uint8Array([1, 2, 3, 4]));

      const result = await node.execute({
        nodeId: "test-node",
        workflowId: "test-workflow",
        organizationId: "test-org",
        inputs: {
          url: "https://example.com/test.tif",
          bbox: [-10, -10, 10, 10],
          width: 2,
          height: 2,
        },
        env: {} as any,
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.image).toEqual({
        data: new Uint8Array([1, 2, 3, 4]),
        mimeType: "image/png",
      });

      // Verify the correct parameters were passed
      expect(mockTiff.readRasters).toHaveBeenCalledWith({
        bbox: [-10, -10, 10, 10],
        width: 2,
        height: 2,
        fillValue: -9999,
      });

      expect(encode).toHaveBeenCalledWith(expect.any(Uint8Array), 2, 2);
    });
  });

  describe("nodeType", () => {
    it("should have correct node type definition", () => {
      const nodeType = GeoTiffQueryNode.nodeType;

      expect(nodeType.id).toBe("geotiff-query");
      expect(nodeType.name).toBe("GeoTIFF Query");
      expect(nodeType.type).toBe("geotiff-query");
      expect(nodeType.inputs).toHaveLength(4);
      expect(nodeType.outputs).toHaveLength(1);

      const inputs = nodeType.inputs;
      expect(inputs[0].name).toBe("url");
      expect(inputs[1].name).toBe("bbox");
      expect(inputs[2].name).toBe("width");
      expect(inputs[3].name).toBe("height");

      const output = nodeType.outputs[0];
      expect(output.name).toBe("image");
      expect(output.type).toBe("image");
    });
  });
});
