import { encode } from "@cf-wasm/png";
import { NodeExecution, NodeType } from "@dafthunk/types";
import { fromUrl } from "geotiff";

import { ExecutableNode, NodeContext } from "../../runtime/node-types";

type TypedArray = Uint8Array | Uint16Array | Int16Array | Float32Array;

interface DEMMetadata {
  bounds: [number, number, number, number];
  elevationRange: {
    min: number;
    max: number;
    unit: string;
  };
  noDataValue: number;
  verticalDatum?: string;
  encoding: {
    type: "mapbox-terrain-rgb";
    version: "v1";
    precision: 0.1;
    formula: string;
  };
  pixelSize: {
    x: number;
    y: number;
    unit: string;
  };
}

export class GeoTiffDemQueryNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "geotiff-dem-query",
    name: "GeoTIFF DEM Query",
    type: "geotiff-dem-query",
    description:
      "Query a Digital Elevation Model GeoTIFF and return terrain data encoded as Mapbox Terrain-RGB PNG",
    tags: ["3D", "GeoTIFF", "DEM", "Query"],
    icon: "search",
    inlinable: false,
    usage: 10,
    inputs: [
      {
        name: "url",
        type: "string",
        description: "URL to the DEM GeoTIFF file",
        required: true,
      },
      {
        name: "bbox",
        type: "json",
        description:
          "Bounding box [minX, minY, maxX, maxY] in WGS84. Uses full bounds if not provided.",
        required: false,
      },
      {
        name: "width",
        type: "number",
        description: "Output width in pixels",
        required: true,
      },
      {
        name: "height",
        type: "number",
        description: "Output height in pixels",
        required: true,
      },
    ],
    outputs: [
      {
        name: "image",
        type: "image",
        description: "DEM data encoded as Mapbox Terrain-RGB PNG",
      },
      {
        name: "metadata",
        type: "json",
        description:
          "DEM metadata including elevation range, datum, and encoding info",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    const { url, bbox, width, height } = context.inputs;

    if (!url || typeof url !== "string") {
      return this.createErrorResult("URL is required and must be a string.");
    }
    if (bbox && (!Array.isArray(bbox) || bbox.length !== 4)) {
      return this.createErrorResult(
        "Bbox must be an array of 4 numbers [minX, minY, maxX, maxY]."
      );
    }
    if (typeof width !== "number" || typeof height !== "number") {
      return this.createErrorResult("Width and height must be numbers.");
    }

    try {
      const demData = await this.processDemRaster(
        url,
        bbox as [number, number, number, number] | undefined,
        width,
        height
      );

      const metadata = await this.extractDemMetadata(url, demData);

      const terrainRgbaPixels = this.createTerrainRgbaPixels(
        demData.elevations,
        width,
        height,
        demData.noDataValue
      );

      const pngData = encode(terrainRgbaPixels, width, height);

      return this.createSuccessResult({
        image: {
          data: pngData,
          mimeType: "image/png",
        },
        metadata,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return this.createErrorResult(`DEM query failed: ${errorMessage}`);
    }
  }

  private async processDemRaster(
    url: string,
    bbox: [number, number, number, number] | undefined,
    width: number,
    height: number
  ): Promise<{
    elevations: Float32Array;
    bounds: [number, number, number, number];
    noDataValue: number;
  }> {
    try {
      const tiff = await fromUrl(url);
      const image = await tiff.getImage(0);

      const geoTiffBounds = image.getBoundingBox() as [
        number,
        number,
        number,
        number,
      ];

      if (bbox) {
        const validation = this.validateBounds(bbox, geoTiffBounds);
        if (!validation.isValid) {
          throw new Error(validation.error!);
        }
      }

      const finalBbox = bbox || geoTiffBounds;

      const rasterData = await tiff.readRasters({
        bbox: finalBbox,
        width,
        height,
        fillValue: -9999,
      });

      if (
        !rasterData ||
        !Array.isArray(rasterData) ||
        rasterData.length === 0
      ) {
        throw new Error("No raster data returned from DEM GeoTIFF");
      }

      const elevationBand = rasterData[0] as TypedArray;
      const elevations = this.extractElevationValues(elevationBand);
      const noDataValue = image.getGDALNoData() || -9999;

      return {
        elevations,
        bounds: finalBbox,
        noDataValue,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`DEM raster processing error: ${message}`);
    }
  }

  private validateBounds(
    requestedBbox: [number, number, number, number],
    geoTiffBounds: [number, number, number, number]
  ): { isValid: boolean; error?: string } {
    const [reqMinX, reqMinY, reqMaxX, reqMaxY] = requestedBbox;
    const [geoMinX, geoMinY, geoMaxX, geoMaxY] = geoTiffBounds;

    if (
      reqMinX < geoMinX ||
      reqMaxX > geoMaxX ||
      reqMinY < geoMinY ||
      reqMaxY > geoMaxY
    ) {
      return {
        isValid: false,
        error: `Requested bbox [${requestedBbox.join(", ")}] exceeds DEM bounds [${geoTiffBounds.join(", ")}]`,
      };
    }

    return { isValid: true };
  }

  private extractElevationValues(elevationBand: TypedArray): Float32Array {
    const elevations = new Float32Array(elevationBand.length);

    for (let i = 0; i < elevationBand.length; i++) {
      elevations[i] = Number(elevationBand[i]);
    }

    return elevations;
  }

  private encodeElevationToRgb(elevation: number): [number, number, number] {
    const value = Math.round((elevation + 10000) / 0.1);
    const clampedValue = Math.max(0, Math.min(16777215, value));

    const r = Math.floor(clampedValue / (256 * 256));
    const g = Math.floor((clampedValue % (256 * 256)) / 256);
    const b = Math.floor(clampedValue % 256);

    return [r, g, b];
  }

  private clampElevationRange(elevation: number): number {
    return Math.max(-10000, Math.min(6553.5, elevation));
  }

  private createTerrainRgbaPixels(
    elevations: Float32Array,
    width: number,
    height: number,
    noDataValue: number
  ): Uint8Array {
    const rgbaPixels = new Uint8Array(width * height * 4);

    for (let i = 0; i < elevations.length; i++) {
      const baseIndex = i * 4;
      const elevation = elevations[i];

      if (elevation === noDataValue || isNaN(elevation)) {
        rgbaPixels[baseIndex] = 0;
        rgbaPixels[baseIndex + 1] = 0;
        rgbaPixels[baseIndex + 2] = 0;
        rgbaPixels[baseIndex + 3] = 0;
      } else {
        const clampedElevation = this.clampElevationRange(elevation);
        const [r, g, b] = this.encodeElevationToRgb(clampedElevation);

        rgbaPixels[baseIndex] = r;
        rgbaPixels[baseIndex + 1] = g;
        rgbaPixels[baseIndex + 2] = b;
        rgbaPixels[baseIndex + 3] = 255;
      }
    }

    return rgbaPixels;
  }

  private async extractDemMetadata(
    url: string,
    demData: {
      elevations: Float32Array;
      bounds: [number, number, number, number];
      noDataValue: number;
    }
  ): Promise<DEMMetadata> {
    const tiff = await fromUrl(url);
    const image = await tiff.getImage(0);

    const elevationStats = this.calculateElevationStatistics(
      demData.elevations,
      demData.noDataValue
    );

    const pixelScale = image.getResolution();

    return {
      bounds: demData.bounds,
      elevationRange: {
        min: elevationStats.min,
        max: elevationStats.max,
        unit: "meters",
      },
      noDataValue: demData.noDataValue,
      verticalDatum: this.detectVerticalDatum(image),
      encoding: {
        type: "mapbox-terrain-rgb",
        version: "v1",
        precision: 0.1,
        formula: "height = -10000 + ((R * 256 * 256 + G * 256 + B) * 0.1)",
      },
      pixelSize: {
        x: pixelScale[0],
        y: pixelScale[1],
        unit: "degrees",
      },
    };
  }

  private calculateElevationStatistics(
    elevations: Float32Array,
    noDataValue: number
  ): { min: number; max: number } {
    let min = Infinity;
    let max = -Infinity;

    for (let i = 0; i < elevations.length; i++) {
      const elevation = elevations[i];
      if (elevation !== noDataValue && !isNaN(elevation)) {
        if (elevation < min) min = elevation;
        if (elevation > max) max = elevation;
      }
    }

    return {
      min: min === Infinity ? 0 : min,
      max: max === -Infinity ? 0 : max,
    };
  }

  private detectVerticalDatum(image: any): string | undefined {
    try {
      const geoKeys = image.getGeoKeys();
      if (geoKeys && geoKeys.VerticalDatumGeoKey) {
        return `EPSG:${geoKeys.VerticalDatumGeoKey}`;
      }
    } catch {
      // Ignore errors in datum detection
    }
    return undefined;
  }
}
