import type { Node } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";

import { GeoTiffMetadataReaderNode } from "./geotiff-metadata-reader-node";

// Mock the geotiff library to avoid Node.js module imports in Cloudflare Workers runtime
vi.mock("geotiff", () => ({
  fromUrl: vi.fn(),
}));

describe("GeoTiffMetadataReaderNode", () => {
  const node = new GeoTiffMetadataReaderNode({
    id: "test-node",
    name: "Test Node",
    type: "geotiff-metadata-reader",
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
        mode: "dev" as const,
        inputs: {},
        getIntegration: async () => {
          throw new Error("No integrations in test");
        },
        env: {} as any,
      });

      expect(result.status).toBe("error");
      expect(result.error).toBe("URL is required and must be a string");
    });

    it("should return error when URL is not a string", async () => {
      const result = await node.execute({
        nodeId: "test-node",
        workflowId: "test-workflow",
        organizationId: "test-org",
        mode: "dev" as const,
        inputs: { url: 123 },
        getIntegration: async () => {
          throw new Error("No integrations in test");
        },
        env: {} as any,
      });

      expect(result.status).toBe("error");
      expect(result.error).toBe("URL is required and must be a string");
    });

    it("should return error when URL format is invalid", async () => {
      const result = await node.execute({
        nodeId: "test-node",
        workflowId: "test-workflow",
        organizationId: "test-org",
        mode: "dev" as const,
        inputs: { url: "not-a-valid-url" },
        getIntegration: async () => {
          throw new Error("No integrations in test");
        },
        env: {} as any,
      });

      expect(result.status).toBe("error");
      expect(result.error).toBe("Invalid URL format");
    });

    it("should handle geotiff processing errors gracefully", async () => {
      const { fromUrl } = await import("geotiff");
      vi.mocked(fromUrl).mockRejectedValueOnce(new Error("Invalid TIFF data"));

      const result = await node.execute({
        nodeId: "test-node",
        workflowId: "test-workflow",
        organizationId: "test-org",
        mode: "dev" as const,
        inputs: { url: "https://example.com/test.tif" },
        getIntegration: async () => {
          throw new Error("No integrations in test");
        },
        env: {} as any,
      });

      expect(result.status).toBe("error");
      expect(result.error).toContain("Failed to read GeoTIFF metadata");
    });

    it("should handle successful metadata extraction", async () => {
      const { fromUrl } = await import("geotiff");

      // Mock geotiff image with metadata
      const mockImage = {
        getWidth: vi.fn().mockReturnValue(1024),
        getHeight: vi.fn().mockReturnValue(768),
        getBoundingBox: vi.fn().mockReturnValue([-180, -90, 180, 90]),
        getSamplesPerPixel: vi.fn().mockReturnValue(3),
        getSampleFormat: vi.fn().mockReturnValue(1),
        getBitsPerSample: vi.fn().mockReturnValue(8),
        getNoDataValue: vi.fn().mockReturnValue(-9999),
        getResolution: vi.fn().mockReturnValue([30, 30]),
        getGeoKeys: vi.fn().mockReturnValue({ GeographicTypeGeoKey: 4326 }),
        getWKT: vi.fn().mockReturnValue(null),
      };

      const mockTiff = {
        getImage: vi.fn().mockResolvedValue(mockImage),
      };

      vi.mocked(fromUrl).mockResolvedValue(mockTiff as any);

      const result = await node.execute({
        nodeId: "test-node",
        workflowId: "test-workflow",
        organizationId: "test-org",
        mode: "dev" as const,
        inputs: { url: "https://example.com/test.tif" },
        getIntegration: async () => {
          throw new Error("No integrations in test");
        },
        env: {} as any,
      });

      expect(result.status).toBe("completed");
      expect(result.outputs?.metadata).toBeDefined();

      const metadata = result.outputs?.metadata;
      expect(metadata.width).toBe(1024);
      expect(metadata.height).toBe(768);
      expect(metadata.bounds).toEqual([-180, -90, 180, 90]);
      expect(metadata.bandCount).toBe(3);
      expect(metadata.dataType).toBe("UInt8");
      expect(metadata.noDataValue).toBe(-9999);
      expect(metadata.pixelSize).toEqual([30, 30]);
      expect(metadata.crs).toBe("EPSG:4326");
    });
  });

  describe("nodeType", () => {
    it("should have correct node type definition", () => {
      const nodeType = GeoTiffMetadataReaderNode.nodeType;

      expect(nodeType.id).toBe("geotiff-metadata-reader");
      expect(nodeType.name).toBe("GeoTIFF Metadata Reader");
      expect(nodeType.type).toBe("geotiff-metadata-reader");
      expect(nodeType.inputs).toHaveLength(1);
      expect(nodeType.outputs).toHaveLength(1);

      const urlInput = nodeType.inputs[0];
      expect(urlInput.name).toBe("url");
      expect(urlInput.type).toBe("string");
      expect(urlInput.required).toBe(true);

      const metadataOutput = nodeType.outputs[0];
      expect(metadataOutput.name).toBe("metadata");
      expect(metadataOutput.type).toBe("json");
    });
  });
});
