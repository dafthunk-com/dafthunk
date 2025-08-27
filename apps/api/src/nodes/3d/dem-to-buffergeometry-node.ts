import { decode } from "@cf-wasm/png";
import { NodeExecution, NodeType } from "@dafthunk/types";
// @ts-ignore – no types available
import Martini from "@mapbox/martini";
import { z } from "zod";

import { ExecutableNode, NodeContext } from "../types";

export class DemToBufferGeometryNode extends ExecutableNode {
  private static readonly elevationDataShape = {
    elevations: {} as Float32Array,
    width: 0,
    height: 0,
    bounds: [0, 0, 0, 0] as readonly [number, number, number, number],
    minElevation: 0,
    maxElevation: 0,
  } as const;

  private static readonly meshDataShape = {
    vertices: {} as Uint16Array,
    triangles: {} as Uint16Array,
    terrainGrid: {} as Float32Array,
  } as const;

  private static readonly transformedGeometryShape = {
    positions: [] as number[],
    uvs: [] as number[],
    vertexMap: {} as Map<number, number>,
    minElevation: 0,
    maxElevation: 0,
  } as const;

  private static readonly demInputSchema = z.object({
    image: z.object({
      data: z.instanceof(Uint8Array),
      mimeType: z.literal("image/png"),
    }),
    bounds: z.tuple([z.number(), z.number(), z.number(), z.number()]),
    tilesetCenter: z.tuple([z.number(), z.number()]).optional(),
    martiniError: z.number().min(0.1).max(100).default(1),
  });

  private static readonly ELEVATION_NO_DATA = -9999;
  private static readonly VERTEX_COMPONENTS_3D = 3;
  private static readonly TRIANGLE_VERTICES = 3;

  public static readonly nodeType: NodeType = {
    id: "dem-to-buffergeometry",
    name: "DEM to BufferGeometry",
    type: "dem-to-buffergeometry",
    description:
      "Convert Digital Elevation Model (DEM) image data to 3D BufferGeometry using Martini triangulation",
    tags: ["3D", "Geo"],
    icon: "mountain",
    documentation: `Converts PNG elevation tiles to 3D mesh geometry suitable for terrain visualization.

## Usage Example

**Input**: 
\`\`\`json
{
  "image": {
    "data": "[Uint8Array of PNG data]",
    "mimeType": "image/png"
  },
  "bounds": [662350, 5751550, 1167741, 6075303],
  "tilesetCenter": [915045.5, 5913426.5],
  "martiniError": 1
}
\`\`\`

**Output**: BufferGeometry with positions, indices, normals, and UVs`,
    inlinable: false,
    inputs: [
      {
        name: "image",
        type: "image",
        description: "DEM PNG image data for terrain generation",
        required: true,
      },
      {
        name: "bounds",
        type: "json",
        description:
          "Geographic bounds [minX, minY, maxX, maxY] in WGS84/Pseudo-Mercator coordinates",
        required: true,
      },
      {
        name: "tilesetCenter",
        type: "json",
        description:
          "Center point [X, Y] for coordinate transformation (default: center of bounds)",
        required: false,
      },
      {
        name: "martiniError",
        type: "number",
        description:
          "Martini triangulation error threshold (0.1-100, default: 1)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "bufferGeometry",
        type: "buffergeometry",
        description: "3D mesh geometry data",
      },
      {
        name: "metadata",
        type: "json",
        description: "Geometry metadata (vertex count, elevation range)",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const validatedInput = DemToBufferGeometryNode.demInputSchema.parse(
        context.inputs
      );
      const { image, bounds, tilesetCenter, martiniError } = validatedInput;

      const elevationData = await this.decodeElevationFromPng(
        image.data,
        bounds
      );

      const meshData = this.generateTerrainMesh(elevationData, martiniError);
      const transformedGeometry = this.transformCoordinates(
        meshData.vertices,
        meshData.terrainGrid,
        elevationData.bounds,
        tilesetCenter,
        elevationData.width,
        elevationData.height
      );
      const indices = this.buildTriangleIndices(
        meshData.triangles,
        transformedGeometry.vertexMap
      );
      const normals = this.computeVertexNormals(
        transformedGeometry.positions,
        indices
      );

      const geometryBuffer = this.createBufferGeometry({
        positions: new Float32Array(transformedGeometry.positions),
        indices: new Uint32Array(indices),
        normals: new Float32Array(normals),
        uvs: new Float32Array(transformedGeometry.uvs),
      });

      return this.createSuccessResult({
        bufferGeometry: {
          data: geometryBuffer,
          mimeType: "application/x-buffer-geometry" as const,
        },
        metadata: {
          vertexCount: transformedGeometry.positions.length / 3,
          triangleCount: indices.length / 3,
          minElevation: transformedGeometry.minElevation,
          maxElevation: transformedGeometry.maxElevation,
        },
      });
    } catch (error) {
      return this.createErrorResult(
        `DEM to BufferGeometry conversion failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async decodeElevationFromPng(
    imageData: Uint8Array,
    bounds: readonly [number, number, number, number]
  ): Promise<typeof DemToBufferGeometryNode.elevationDataShape> {
    const png = await this.decodePngImage(imageData);
    const { data, width, height } = png;

    const elevations = new Float32Array(width * height);
    let minElevation = Infinity;
    let maxElevation = -Infinity;

    for (let i = 0; i < width * height; i++) {
      const pixelIndex = i * 4;
      const r = data[pixelIndex];

      // Decode Mapbox Terrain-RGB format: height = -10000 + ((R * 256 * 256 + G * 256 + B) * 0.1)
      const g = data[pixelIndex + 1];
      const b = data[pixelIndex + 2];
      const elevation = -10000 + (r * 256 * 256 + g * 256 + b) * 0.1;

      elevations[i] = elevation;
      // Check for no-data values (elevation of -10000 indicates no data in Mapbox format)
      if (elevation > -9999) {
        minElevation = Math.min(minElevation, elevation);
        maxElevation = Math.max(maxElevation, elevation);
      }
    }

    return {
      elevations,
      width,
      height,
      bounds,
      minElevation: minElevation === Infinity ? 0 : minElevation,
      maxElevation: maxElevation === -Infinity ? 0 : maxElevation,
    } as typeof DemToBufferGeometryNode.elevationDataShape;
  }

  private async decodePngImage(imageData: Uint8Array): Promise<{
    data: Uint8Array;
    width: number;
    height: number;
  }> {
    try {
      const decodedPng = decode(imageData);
      return {
        data: decodedPng.image,
        width: decodedPng.width,
        height: decodedPng.height,
      };
    } catch (error) {
      throw new Error(
        `Failed to decode PNG image: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private generateTerrainMesh(
    elevationData: typeof DemToBufferGeometryNode.elevationDataShape,
    martiniError: number
  ): typeof DemToBufferGeometryNode.meshDataShape {
    const { width, height, elevations } = elevationData;
    const maxDim = Math.max(width, height);
    const gridSize = this.getNextPowerOf2Plus1(maxDim);
    const terrainGrid = new Float32Array(gridSize * gridSize);

    // Initialize entire grid with no-data values (-10000 for Mapbox Terrain-RGB format)
    terrainGrid.fill(-10000);

    // Fill the grid with actual elevation data (top-left aligned)
    for (let row = 0; row < height; ++row) {
      for (let col = 0; col < width; ++col) {
        const src = row * width + col;
        const dst = row * gridSize + col;
        terrainGrid[dst] = elevations[src];
      }
    }

    const martini = new Martini(gridSize);
    const tile = martini.createTile(terrainGrid);
    const { vertices, triangles } = tile.getMesh(martiniError);

    return { vertices, triangles, terrainGrid };
  }

  private transformCoordinates(
    vertices: Uint16Array,
    terrainGrid: Float32Array,
    bounds: readonly [number, number, number, number],
    tilesetCenter: readonly [number, number] | undefined,
    width: number,
    height: number
  ): typeof DemToBufferGeometryNode.transformedGeometryShape {
    const pos: number[] = [];
    const uvs: number[] = [];
    const vMap = new Map<number, number>();

    const tileCenterDefault: readonly [number, number] = [
      (bounds[0] + bounds[2]) / 2,
      (bounds[1] + bounds[3]) / 2,
    ];
    const actualTilesetCenter = tilesetCenter ?? tileCenterDefault;

    const tileWidth = bounds[2] - bounds[0];
    const tileHeight = bounds[3] - bounds[1];
    const maxDim = Math.max(width, height);
    const gridSize = this.getNextPowerOf2Plus1(maxDim);

    let next = 0;
    let minElevation = Infinity;
    let maxElevation = -Infinity;

    for (let i = 0; i < vertices.length; i += 2) {
      const gx = vertices[i];
      const gy = vertices[i + 1];
      const elevation = terrainGrid[Math.floor(gy) * gridSize + Math.floor(gx)];

      if (elevation <= -9999) {
        vMap.set(i / 2, -1);
        continue;
      }

      vMap.set(i / 2, next);

      // Map grid coordinates to actual data bounds (only the top-left portion contains data)
      // Vertices outside the actual data area will be filtered out by the no-data check above
      const normalizedX = gx / (width - 1);
      const normalizedY = gy / (height - 1);
      const rasterX = bounds[0] + normalizedX * tileWidth;
      const rasterY = bounds[3] - normalizedY * tileHeight;

      const threejsX = rasterX - actualTilesetCenter[0];
      const threejsY = elevation;
      const threejsZ = -(rasterY - actualTilesetCenter[1]);

      pos.push(threejsX, threejsY, threejsZ);
      uvs.push(normalizedX, normalizedY);

      minElevation = Math.min(minElevation, elevation);
      maxElevation = Math.max(maxElevation, elevation);
      ++next;
    }

    return {
      positions: pos,
      uvs,
      vertexMap: vMap,
      minElevation: minElevation === Infinity ? 0 : minElevation,
      maxElevation: maxElevation === -Infinity ? 0 : maxElevation,
    } as typeof DemToBufferGeometryNode.transformedGeometryShape;
  }

  private buildTriangleIndices(
    triangles: Uint16Array,
    vertexMap: Map<number, number>
  ): number[] {
    const indices: number[] = [];

    for (
      let i = 0;
      i < triangles.length;
      i += DemToBufferGeometryNode.TRIANGLE_VERTICES
    ) {
      const a = vertexMap.get(triangles[i])!;
      const b = vertexMap.get(triangles[i + 1])!;
      const c = vertexMap.get(triangles[i + 2])!;

      if (a < 0 || b < 0 || c < 0) continue;

      indices.push(a, b, c);
    }

    return indices;
  }

  private computeVertexNormals(
    positions: number[],
    indices: number[]
  ): number[] {
    const normals = new Float32Array(positions.length);

    for (
      let i = 0;
      i < indices.length;
      i += DemToBufferGeometryNode.TRIANGLE_VERTICES
    ) {
      const ia = indices[i] * DemToBufferGeometryNode.VERTEX_COMPONENTS_3D;
      const ib = indices[i + 1] * DemToBufferGeometryNode.VERTEX_COMPONENTS_3D;
      const ic = indices[i + 2] * DemToBufferGeometryNode.VERTEX_COMPONENTS_3D;

      const [nx, ny, nz] = this.computeFaceNormal(positions, ia, ib, ic);

      normals[ia] += nx;
      normals[ia + 1] += ny;
      normals[ia + 2] += nz;
      normals[ib] += nx;
      normals[ib + 1] += ny;
      normals[ib + 2] += nz;
      normals[ic] += nx;
      normals[ic + 1] += ny;
      normals[ic + 2] += nz;
    }

    for (
      let i = 0;
      i < normals.length;
      i += DemToBufferGeometryNode.VERTEX_COMPONENTS_3D
    ) {
      this.normalizeVector(normals, i);
    }

    return Array.from(normals);
  }

  private computeFaceNormal(
    positions: number[],
    ia: number,
    ib: number,
    ic: number
  ): [number, number, number] {
    const ax = positions[ia],
      ay = positions[ia + 1],
      az = positions[ia + 2];
    const bx = positions[ib],
      by = positions[ib + 1],
      bz = positions[ib + 2];
    const cx = positions[ic],
      cy = positions[ic + 1],
      cz = positions[ic + 2];

    const abx = bx - ax,
      aby = by - ay,
      abz = bz - az;
    const acx = cx - ax,
      acy = cy - ay,
      acz = cz - az;

    return [
      aby * acz - abz * acy,
      abz * acx - abx * acz,
      abx * acy - aby * acx,
    ];
  }

  private normalizeVector(normals: Float32Array, startIndex: number): void {
    const nx = normals[startIndex];
    const ny = normals[startIndex + 1];
    const nz = normals[startIndex + 2];
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;

    normals[startIndex] = nx / len;
    normals[startIndex + 1] = ny / len;
    normals[startIndex + 2] = nz / len;
  }

  private createBufferGeometry(data: {
    positions: Float32Array;
    indices: Uint32Array;
    normals: Float32Array;
    uvs: Float32Array;
  }): Uint8Array {
    const totalSize =
      4 +
      data.positions.byteLength +
      data.indices.byteLength +
      data.normals.byteLength +
      data.uvs.byteLength;

    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);

    let offset = 0;

    view.setUint32(offset, data.positions.length / 3, true);
    offset += 4;

    new Uint8Array(buffer, offset, data.positions.byteLength).set(
      new Uint8Array(data.positions.buffer)
    );
    offset += data.positions.byteLength;

    new Uint8Array(buffer, offset, data.indices.byteLength).set(
      new Uint8Array(data.indices.buffer)
    );
    offset += data.indices.byteLength;

    new Uint8Array(buffer, offset, data.normals.byteLength).set(
      new Uint8Array(data.normals.buffer)
    );
    offset += data.normals.byteLength;

    new Uint8Array(buffer, offset, data.uvs.byteLength).set(
      new Uint8Array(data.uvs.buffer)
    );

    return new Uint8Array(buffer);
  }

  private getNextPowerOf2Plus1(n: number): number {
    let size = 1;
    while (size < n) {
      size *= 2;
    }
    return size + 1;
  }
}
