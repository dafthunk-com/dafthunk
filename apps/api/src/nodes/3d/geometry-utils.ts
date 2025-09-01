/**
 * Utility functions for 3D geometry operations
 */

import { Float32BufferAttribute } from "three/src/core/BufferAttribute.js";
import { Uint32BufferAttribute } from "three/src/core/BufferAttribute.js";
import { BufferGeometry } from "three/src/core/BufferGeometry.js";
import { Vector3 } from "three/src/math/Vector3.js";

export interface GeometryData {
  positions: Float32Array;
  indices: Uint32Array;
  normals: Float32Array;
  uvs: Float32Array;
  vertexCount: number;
}

export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  center: { x: number; y: number; z: number };
}

/**
 * Creates a buffer geometry in the standard format used by the system
 * @param data - The geometry data arrays
 * @returns Uint8Array containing the packed geometry data
 */
export function createBufferGeometry(data: GeometryData): Uint8Array {
  const vertexCount = data.positions.length / 3;
  const totalSize =
    4 +
    data.positions.byteLength +
    data.indices.byteLength +
    data.normals.byteLength +
    data.uvs.byteLength;

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  let offset = 0;

  // Write vertex count (first 4 bytes)
  view.setUint32(offset, vertexCount, true);
  offset += 4;

  // Write positions
  new Uint8Array(buffer, offset, data.positions.byteLength).set(
    new Uint8Array(data.positions.buffer)
  );
  offset += data.positions.byteLength;

  // Write indices
  new Uint8Array(buffer, offset, data.indices.byteLength).set(
    new Uint8Array(data.indices.buffer)
  );
  offset += data.indices.byteLength;

  // Write normals
  new Uint8Array(buffer, offset, data.normals.byteLength).set(
    new Uint8Array(data.normals.buffer)
  );
  offset += data.normals.byteLength;

  // Write UVs
  new Uint8Array(buffer, offset, data.uvs.byteLength).set(
    new Uint8Array(data.uvs.buffer)
  );

  return new Uint8Array(buffer);
}

/**
 * Converts our custom buffer format to a Three.js BufferGeometry
 * @param bufferData - The buffer data to convert
 * @returns Three.js BufferGeometry
 */
export function bufferToThreeGeometry(bufferData: Uint8Array): BufferGeometry {
  const geometryData = extractBufferGeometry(bufferData);
  const geometry = new BufferGeometry();

  // Set positions
  geometry.setAttribute(
    "position",
    new Float32BufferAttribute(geometryData.positions, 3)
  );

  // Set indices if they exist
  if (geometryData.indices.length > 0) {
    geometry.setIndex(new Uint32BufferAttribute(geometryData.indices, 1));
  }

  // Set normals if they exist
  if (geometryData.normals.length > 0) {
    geometry.setAttribute(
      "normal",
      new Float32BufferAttribute(geometryData.normals, 3)
    );
  }

  // Set UVs if they exist
  if (geometryData.uvs.length > 0) {
    geometry.setAttribute(
      "uv",
      new Float32BufferAttribute(geometryData.uvs, 2)
    );
  }

  return geometry;
}

/**
 * Converts a Three.js BufferGeometry back to our custom buffer format
 * @param geometry - Three.js BufferGeometry to convert
 * @returns Buffer data in our custom format
 */
export function threeGeometryToBuffer(geometry: BufferGeometry): Uint8Array {
  const positionAttribute = geometry.getAttribute("position");
  const normalAttribute = geometry.getAttribute("normal");
  const uvAttribute = geometry.getAttribute("uv");
  const indexAttribute = geometry.getIndex();

  const positions = positionAttribute
    ? new Float32Array(positionAttribute.array)
    : new Float32Array();
  const normals = normalAttribute
    ? new Float32Array(normalAttribute.array)
    : new Float32Array();
  const uvs = uvAttribute
    ? new Float32Array(uvAttribute.array)
    : new Float32Array();
  const indices = indexAttribute
    ? new Uint32Array(indexAttribute.array)
    : new Uint32Array();

  const vertexCount = positions.length / 3;

  return createBufferGeometry({
    positions,
    indices,
    normals,
    uvs,
    vertexCount,
  });
}

/**
 * Translates vertex positions using Three.js Vector3 for better precision
 * @param positions - The vertex positions array
 * @param x - Translation offset along X-axis
 * @param y - Translation offset along Y-axis
 * @param z - Translation offset along Z-axis
 * @returns Translated positions array
 */
export function translatePositions(
  positions: Float32Array,
  x: number,
  y: number,
  z: number
): Float32Array {
  const translatedPositions = new Float32Array(positions.length);
  const translation = new Vector3(x, y, z);

  for (let i = 0; i < positions.length; i += 3) {
    const vertex = new Vector3(
      positions[i],
      positions[i + 1],
      positions[i + 2]
    );
    vertex.add(translation);

    translatedPositions[i] = vertex.x;
    translatedPositions[i + 1] = vertex.y;
    translatedPositions[i + 2] = vertex.z;
  }

  return translatedPositions;
}

/**
 * Scales vertex positions using Three.js Vector3 for better precision
 * @param positions - The vertex positions array
 * @param x - Scale factor along X-axis
 * @param y - Scale factor along Y-axis
 * @param z - Scale factor along Z-axis
 * @returns Scaled positions array
 */
export function scalePositions(
  positions: Float32Array,
  x: number,
  y: number,
  z: number
): Float32Array {
  const scaledPositions = new Float32Array(positions.length);
  const scale = new Vector3(x, y, z);

  for (let i = 0; i < positions.length; i += 3) {
    const vertex = new Vector3(
      positions[i],
      positions[i + 1],
      positions[i + 2]
    );
    vertex.multiply(scale);

    scaledPositions[i] = vertex.x;
    scaledPositions[i + 1] = vertex.y;
    scaledPositions[i + 2] = vertex.z;
  }

  return scaledPositions;
}

/**
 * Extracts geometry data from a buffer geometry
 * @param bufferData - The buffer data to extract from
 * @returns Extracted geometry data
 */
export function extractBufferGeometry(bufferData: Uint8Array): GeometryData {
  const view = new DataView(bufferData.buffer, bufferData.byteOffset);
  let offset = 0;

  // Read vertex count (first 4 bytes)
  const vertexCount = view.getUint32(offset, true);
  offset += 4;

  // Calculate component sizes based on vertex count
  const positionsSize = vertexCount * 3 * 4; // 3 components * 4 bytes per float
  const normalsSize = vertexCount * 3 * 4;
  const uvsSize = vertexCount * 2 * 4;

  // Calculate indices size from remaining buffer space
  const remainingSize =
    bufferData.byteLength - offset - positionsSize - normalsSize - uvsSize;
  const indicesSize = remainingSize;

  // Extract positions
  const positionsBuffer = bufferData.slice(offset, offset + positionsSize);
  const positions = new Float32Array(
    positionsBuffer.buffer,
    positionsBuffer.byteOffset,
    vertexCount * 3
  );
  offset += positionsSize;

  // Extract indices (Uint32Array format)
  const indicesCount = indicesSize / 4;
  const indicesBuffer = bufferData.slice(offset, offset + indicesSize);
  const indices = new Uint32Array(
    indicesBuffer.buffer,
    indicesBuffer.byteOffset,
    indicesCount
  );
  offset += indicesSize;

  // Extract normals
  const normalsBuffer = bufferData.slice(offset, offset + normalsSize);
  const normals = new Float32Array(
    normalsBuffer.buffer,
    normalsBuffer.byteOffset,
    vertexCount * 3
  );
  offset += normalsSize;

  // Extract UVs
  const uvsBuffer = bufferData.slice(offset, offset + uvsSize);
  const uvs = new Float32Array(
    uvsBuffer.buffer,
    uvsBuffer.byteOffset,
    vertexCount * 2
  );

  return {
    positions,
    indices,
    normals,
    uvs,
    vertexCount,
  };
}

/**
 * Calculates the bounding box of a geometry from its vertex positions
 * @param positions - The vertex positions array
 * @returns Bounding box information
 */
export function calculateBounds(positions: Float32Array): Bounds {
  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;
  let minZ = Infinity,
    maxZ = -Infinity;

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];

    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }

  return {
    minX,
    maxX,
    minY,
    maxY,
    minZ,
    maxZ,
    center: {
      x: (maxX + minX) / 2,
      y: (maxY + minY) / 2,
      z: (maxZ + minZ) / 2,
    },
  };
}
