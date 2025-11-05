import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { BufferGeometryToGltfNode } from "./buffergeometry-to-gltf-node";

describe("BufferGeometryToGltfNode", () => {
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

  const createTestBufferGeometry = (): Uint8Array => {
    // Create a simple triangle geometry
    const positions = new Float32Array([
      0,
      0,
      0, // vertex 0
      1,
      0,
      0, // vertex 1
      0.5,
      1,
      0, // vertex 2
    ]);

    const indices = new Uint32Array([0, 1, 2]); // Single triangle

    const normals = new Float32Array([
      0,
      0,
      1, // normal for vertex 0
      0,
      0,
      1, // normal for vertex 1
      0,
      0,
      1, // normal for vertex 2
    ]);

    const uvs = new Float32Array([
      0,
      0, // UV for vertex 0
      1,
      0, // UV for vertex 1
      0.5,
      1, // UV for vertex 2
    ]);

    // Pack into BufferGeometry format: vertexCount + positions + indices + normals + uvs
    const vertexCount = 3;
    const totalSize =
      4 +
      positions.byteLength +
      indices.byteLength +
      normals.byteLength +
      uvs.byteLength;
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);

    let offset = 0;

    // Write vertex count
    view.setUint32(offset, vertexCount, true);
    offset += 4;

    // Write positions
    new Uint8Array(buffer, offset, positions.byteLength).set(
      new Uint8Array(positions.buffer)
    );
    offset += positions.byteLength;

    // Write indices
    new Uint8Array(buffer, offset, indices.byteLength).set(
      new Uint8Array(indices.buffer)
    );
    offset += indices.byteLength;

    // Write normals
    new Uint8Array(buffer, offset, normals.byteLength).set(
      new Uint8Array(normals.buffer)
    );
    offset += normals.byteLength;

    // Write UVs
    new Uint8Array(buffer, offset, uvs.byteLength).set(
      new Uint8Array(uvs.buffer)
    );

    return new Uint8Array(buffer);
  };

  const createTestPngTexture = (): Uint8Array => {
    // Minimal valid PNG header (8 bytes) + IHDR chunk (25 bytes) + IEND chunk (12 bytes)
    // This creates a 1x1 pixel red PNG
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
      0x0d, // IHDR length
      0x49,
      0x48,
      0x44,
      0x52, // IHDR
      0x00,
      0x00,
      0x00,
      0x01, // width: 1
      0x00,
      0x00,
      0x00,
      0x01, // height: 1
      0x08,
      0x02,
      0x00,
      0x00,
      0x00, // bit depth, color type, compression, filter, interlace
      0x90,
      0x77,
      0x53,
      0xde, // CRC
      0x00,
      0x00,
      0x00,
      0x00, // IEND length
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

  it("should have correct nodeType definition", () => {
    expect(BufferGeometryToGltfNode.nodeType.id).toBe("buffergeometry-to-gltf");
    expect(BufferGeometryToGltfNode.nodeType.name).toBe(
      "BufferGeometry to glTF"
    );
    expect(BufferGeometryToGltfNode.nodeType.type).toBe(
      "buffergeometry-to-gltf"
    );
    expect(BufferGeometryToGltfNode.nodeType.tags).toContain("3D");
    expect(BufferGeometryToGltfNode.nodeType.inputs).toHaveLength(3);
    expect(BufferGeometryToGltfNode.nodeType.outputs).toHaveLength(2);
  });

  it("should execute successfully with valid BufferGeometry input", async () => {
    const geometryData = createTestBufferGeometry();
    const context = createMockContext({
      bufferGeometry: {
        data: geometryData,
        mimeType: "application/x-buffer-geometry",
      },
    });

    const node = new BufferGeometryToGltfNode({ id: "test" } as any);
    const result = await node.execute(context);

    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs!.gltf).toBeDefined();
    expect(result.outputs!.metadata).toBeDefined();

    const gltf = result.outputs!.gltf as any;
    expect(gltf.data).toBeInstanceOf(Uint8Array);
    expect(gltf.mimeType).toBe("model/gltf-binary");
    expect(gltf.data.byteLength).toBeGreaterThan(0);

    // Validate GLB magic number
    const view = new DataView(gltf.data.buffer);
    const magic = view.getUint32(0, true);
    expect(magic).toBe(0x46546c67); // 'glTF' in little endian

    const metadata = result.outputs!.metadata as any;
    expect(metadata.vertexCount).toBe(3);
    expect(metadata.triangleCount).toBe(1);
    expect(metadata.hasTexture).toBe(false);
    expect(metadata.materialType).toBe("PBR");
    expect(metadata.fileSize).toBe(gltf.data.byteLength);
  });

  it("should execute successfully with BufferGeometry and texture", async () => {
    const geometryData = createTestBufferGeometry();
    const textureData = createTestPngTexture();

    const context = createMockContext({
      bufferGeometry: {
        data: geometryData,
        mimeType: "application/x-buffer-geometry",
      },
      texture: {
        data: textureData,
        mimeType: "image/png",
      },
    });

    const node = new BufferGeometryToGltfNode({ id: "test" } as any);
    const result = await node.execute(context);

    expect(result.status).toBe("completed");

    const metadata = result.outputs!.metadata as any;
    expect(metadata.hasTexture).toBe(true);
    expect(metadata.vertexCount).toBe(3);
    expect(metadata.triangleCount).toBe(1);
  });

  it("should execute successfully with custom material properties", async () => {
    const geometryData = createTestBufferGeometry();

    const context = createMockContext({
      bufferGeometry: {
        data: geometryData,
        mimeType: "application/x-buffer-geometry",
      },
      materialProperties: {
        baseColorFactor: [0.5, 0.5, 0.5, 1.0],
        metallicFactor: 0.5,
        roughnessFactor: 0.3,
      },
    });

    const node = new BufferGeometryToGltfNode({ id: "test" } as any);
    const result = await node.execute(context);

    expect(result.status).toBe("completed");
    expect(result.outputs!.gltf).toBeDefined();
    expect(result.outputs!.metadata).toBeDefined();
  });

  it("should fail with invalid BufferGeometry data", async () => {
    const context = createMockContext({
      bufferGeometry: {
        data: new Uint8Array([1, 2, 3]), // Invalid data
        mimeType: "application/x-buffer-geometry",
      },
    });

    const node = new BufferGeometryToGltfNode({ id: "test" } as any);
    const result = await node.execute(context);

    expect(result.status).toBe("error");
    expect(result.error).toContain("BufferGeometry to glTF conversion failed");
  });

  it("should fail with missing required geometry input", async () => {
    const context = createMockContext({
      texture: {
        data: createTestPngTexture(),
        mimeType: "image/png",
      },
    });

    const node = new BufferGeometryToGltfNode({ id: "test" } as any);
    const result = await node.execute(context);

    expect(result.status).toBe("error");
    expect(result.error).toContain("BufferGeometry to glTF conversion failed");
  });

  it("should fail with invalid geometry MIME type", async () => {
    const geometryData = createTestBufferGeometry();

    const context = createMockContext({
      bufferGeometry: {
        data: geometryData,
        mimeType: "application/invalid", // Wrong MIME type
      },
    });

    const node = new BufferGeometryToGltfNode({ id: "test" } as any);
    const result = await node.execute(context);

    expect(result.status).toBe("error");
    expect(result.error).toContain("BufferGeometry to glTF conversion failed");
  });

  it("should fail with invalid texture MIME type", async () => {
    const geometryData = createTestBufferGeometry();
    const textureData = createTestPngTexture();

    const context = createMockContext({
      bufferGeometry: {
        data: geometryData,
        mimeType: "application/x-buffer-geometry",
      },
      texture: {
        data: textureData,
        mimeType: "image/jpeg", // Wrong MIME type (should be PNG)
      },
    });

    const node = new BufferGeometryToGltfNode({ id: "test" } as any);
    const result = await node.execute(context);

    expect(result.status).toBe("error");
    expect(result.error).toContain("BufferGeometry to glTF conversion failed");
  });

  it("should fail with invalid material properties", async () => {
    const geometryData = createTestBufferGeometry();

    const context = createMockContext({
      bufferGeometry: {
        data: geometryData,
        mimeType: "application/x-buffer-geometry",
      },
      materialProperties: {
        metallicFactor: 2.0, // Invalid: should be 0-1
      },
    });

    const node = new BufferGeometryToGltfNode({ id: "test" } as any);
    const result = await node.execute(context);

    expect(result.status).toBe("error");
    expect(result.error).toContain("BufferGeometry to glTF conversion failed");
  });
});
