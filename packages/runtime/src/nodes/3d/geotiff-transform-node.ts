import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

// Import projection utilities from 3dtiles package
// These will need to be available in the API context
// You may need to adjust the import path based on your workspace setup

export class GeoTiffTransformNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "geotiff-transform",
    name: "GeoTIFF Transform to Web Mercator",
    type: "geotiff-transform",
    description:
      "Transform GeoTIFF metadata from WGS84 (EPSG:4326) to Web Mercator (EPSG:3857)",
    tags: ["3D", "GeoTIFF", "Transform"],
    icon: "map",
    usage: 10,
    inputs: [
      {
        name: "metadata",
        type: "json",
        description: "GeoTIFF metadata from GeoTIFF Metadata Reader",
        required: true,
      },
    ],
    outputs: [
      {
        name: "transformed",
        type: "json",
        description: "Metadata with Web Mercator bounds",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { metadata } = context.inputs;

      // Validate CRS is EPSG:4326 before transformation
      if (metadata.crs && metadata.crs !== "EPSG:4326") {
        return this.createErrorResult(
          `Cannot transform: expected EPSG:4326, but metadata has CRS: ${metadata.crs}`
        );
      }

      // Extract bounds from metadata
      const [west, south, east, north] = metadata.bounds;

      // Transform WGS84 bounds to Web Mercator
      const [minX, minY] = this.WGS84toEPSG3857(west, south);
      const [maxX, maxY] = this.WGS84toEPSG3857(east, north);

      // Create transformed metadata with Web Mercator bounds
      const transformed = {
        ...metadata,
        bounds: [minX, minY, maxX, maxY],
        crs: "EPSG:3857",
      };

      return this.createSuccessResult({ transformed });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return this.createErrorResult(
        `Failed to transform GeoTIFF metadata: ${errorMessage}`
      );
    }
  }

  /**
   * Convert WGS84 geographic coordinates to Web Mercator coordinates
   *
   * Based on proj4 EPSG:3857 transformation.
   * Web Mercator is widely used by web mapping services.
   *
   * @param lon - WGS84 longitude in degrees (-180 to +180)
   * @param lat - WGS84 latitude in degrees (-85.0511 to +85.0511)
   * @returns Web Mercator coordinates [x, y] in meters
   */
  private WGS84toEPSG3857(lon: number, lat: number): [number, number] {
    // Web Mercator constants
    const EARTH_RADIUS = 6378137; // WGS84 semi-major axis in meters
    const MAX_LATITUDE = 85.0511287798; // Max latitude for Web Mercator

    // Clamp latitude to valid Web Mercator range
    const clampedLat = Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, lat));

    // Convert to radians
    const lonRad = (lon * Math.PI) / 180;
    const latRad = (clampedLat * Math.PI) / 180;

    // Web Mercator formulas
    const x = EARTH_RADIUS * lonRad;
    const y = EARTH_RADIUS * Math.log(Math.tan(Math.PI / 4 + latRad / 2));

    return [x, y];
  }
}
