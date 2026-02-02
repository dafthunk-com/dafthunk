import { NodeExecution, NodeType } from "@dafthunk/types";
import { fromUrl } from "geotiff";

import { ExecutableNode, NodeContext } from "../../runtime/node-types";

export class GeoTiffMetadataReaderNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "geotiff-metadata-reader",
    name: "GeoTIFF Metadata Reader",
    type: "geotiff-metadata-reader",
    description:
      "Read metadata from Cloud Optimized GeoTIFF without downloading content",
    tags: ["3D", "GeoTIFF", "Metadata"],
    icon: "info",
    inlinable: false,
    usage: 10,
    inputs: [
      {
        name: "url",
        type: "string",
        description: "URL to Cloud Optimized GeoTIFF file",
        required: true,
      },
    ],
    outputs: [
      {
        name: "metadata",
        type: "json",
        description: "GeoTIFF metadata as JSON",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { url } = context.inputs;

      if (!url || typeof url !== "string") {
        return this.createErrorResult("URL is required and must be a string");
      }

      // Validate URL format
      try {
        new URL(url);
      } catch (_) {
        return this.createErrorResult("Invalid URL format");
      }

      // Use geotiff library to read only metadata (no raster data download)
      const tiff = await fromUrl(url);
      const image = await tiff.getImage(0); // First image only

      // Extract basic metadata
      const metadata: {
        width: number;
        height: number;
        bounds: [number, number, number, number];
        crs?: string;
        pixelSize?: [number, number];
        noDataValue?: number;
        dataType?: string;
        bandCount: number;
      } = {
        width: image.getWidth(),
        height: image.getHeight(),
        bounds: image.getBoundingBox() as [number, number, number, number],
        bandCount: image.getSamplesPerPixel(),
        // Optional metadata (may not be available in all files)
        dataType: this.getDataType(image),
        noDataValue: this.getNoDataValue(image),
        pixelSize: this.getPixelSize(image),
        crs: this.getCRS(image),
      };

      return this.createSuccessResult({ metadata });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return this.createErrorResult(
        `Failed to read GeoTIFF metadata: ${errorMessage}`
      );
    }
  }

  private getDataType(image: any): string | undefined {
    try {
      const sampleFormat = image.getSampleFormat();
      const bitsPerSample = image.getBitsPerSample();
      // Map to common data type names
      if (sampleFormat === 3) return `Float${bitsPerSample}`;
      if (sampleFormat === 1) return `UInt${bitsPerSample}`;
      if (sampleFormat === 2) return `Int${bitsPerSample}`;
      return undefined;
    } catch {
      return undefined;
    }
  }

  private getNoDataValue(image: any): number | undefined {
    try {
      return image.getNoDataValue();
    } catch {
      return undefined;
    }
  }

  private getPixelSize(image: any): [number, number] | undefined {
    try {
      return image.getResolution();
    } catch {
      return undefined;
    }
  }

  private getCRS(image: any): string | undefined {
    try {
      // Try to get EPSG code first, fallback to WKT
      const geoKeys = image.getGeoKeys();
      const epsg =
        geoKeys?.ProjectedCSTypeGeoKey || geoKeys?.GeographicTypeGeoKey;
      if (epsg) return `EPSG:${epsg}`;

      const wkt = image.getWKT();
      if (wkt) return wkt;

      return undefined;
    } catch {
      return undefined;
    }
  }
}
