import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import type { GeoTIFFImage } from "geotiff";
import { fromUrl } from "geotiff";

export class GeoTiffMetadataReaderNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "geotiff-metadata-reader",
    name: "GeoTIFF Metadata Reader",
    type: "geotiff-metadata-reader",
    description:
      "Read metadata from Cloud Optimized GeoTIFF without downloading content",
    tags: ["3D", "GeoTIFF", "Metadata"],
    documentation:
      "Reads the header of a Cloud Optimized GeoTIFF over HTTP range requests, so the raster itself is never downloaded. Returns the dimensions, band count, data type, no-data value, pixel size and CRS — enough to decide how to query the file before paying to read it.",
    icon: "info",
    inlinable: false,
    usage: 10,
    asTool: false,
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

  private getDataType(image: GeoTIFFImage): string | undefined {
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

  private getNoDataValue(image: GeoTIFFImage): number | undefined {
    try {
      return image.getGDALNoData() ?? undefined;
    } catch {
      return undefined;
    }
  }

  private getPixelSize(image: GeoTIFFImage): [number, number] | undefined {
    try {
      const [x, y] = image.getResolution();
      if (typeof x !== "number" || typeof y !== "number") return undefined;
      return [x, y];
    } catch {
      return undefined;
    }
  }

  private getCRS(image: GeoTIFFImage): string | undefined {
    try {
      // Prefer the EPSG code; fall back to whichever citation the file carries.
      const geoKeys = image.getGeoKeys();
      const epsg =
        geoKeys?.ProjectedCSTypeGeoKey || geoKeys?.GeographicTypeGeoKey;
      if (epsg) return `EPSG:${epsg}`;

      const citation =
        geoKeys?.PCSCitationGeoKey ||
        geoKeys?.GeogCitationGeoKey ||
        geoKeys?.GTCitationGeoKey;
      return typeof citation === "string" ? citation : undefined;
    } catch {
      return undefined;
    }
  }
}
