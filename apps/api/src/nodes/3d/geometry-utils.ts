/**
 * Utility functions for 3D geometry operations
 */

export interface GeometryData {
  positions: Float32Array;
  indices: Uint32Array;
  normals: Float32Array;
  uvs: Float32Array;
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
