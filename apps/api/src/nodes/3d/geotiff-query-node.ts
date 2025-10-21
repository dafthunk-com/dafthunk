import { encode } from "@cf-wasm/png";
import { NodeExecution, NodeType } from "@dafthunk/types";
import { fromUrl } from "geotiff";

import { ExecutableNode, NodeContext } from "../types";

type TypedArray = Uint8Array | Uint16Array | Int16Array | Float32Array;

export class GeoTiffQueryNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "geotiff-query",
    name: "GeoTIFF Query",
    type: "geotiff-query",
    description:
      "Query a Cloud Optimized GeoTIFF with an optional bounding box and return an image. Uses full GeoTIFF bounds if bbox not provided.",
    tags: ["3D", "GeoTIFF", "Query"],
    icon: "search",
    inputs: [
      {
        name: "url",
        type: "string",
        description: "URL to the Cloud Optimized GeoTIFF file",
        required: true,
      },
      {
        name: "bbox",
        type: "json", // [minX, minY, maxX, maxY] in WGS84
        description:
          "Bounding box coordinates [minX, minY, maxX, maxY]. If not provided, uses full GeoTIFF bounds.",
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
        description: "Queried data as a PNG image",
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
      const tiff = await fromUrl(url);
      const image = await tiff.getImage(0);

      const metadata = {
        width: image.getWidth(),
        height: image.getHeight(),
        bounds: image.getBoundingBox() as [number, number, number, number],
        bandCount: image.getSamplesPerPixel(),
      };

      const finalBbox = bbox
        ? (bbox as [number, number, number, number])
        : metadata.bounds;

      if (bbox) {
        const validation = this.validateBounds(
          bbox as [number, number, number, number],
          metadata
        );
        if (!validation.isValid) {
          return this.createErrorResult(validation.error!);
        }
      }

      const imageData = await this.queryGeoTiff(url, finalBbox, width, height);
      return this.createSuccessResult({
        image: {
          data: imageData,
          mimeType: "image/png",
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return this.createErrorResult(`GeoTIFF query failed: ${errorMessage}`);
    }
  }

  private async queryGeoTiff(
    url: string,
    bbox: [number, number, number, number],
    width: number,
    height: number
  ): Promise<Uint8Array> {
    try {
      const tiff = await fromUrl(url);

      const rasterData = await tiff.readRasters({
        bbox,
        width,
        height,
        fillValue: -9999,
      });

      if (
        !rasterData ||
        !Array.isArray(rasterData) ||
        rasterData.length === 0
      ) {
        throw new Error("No raster data returned from GeoTIFF");
      }

      // Convert raster bands to RGBA preserving original colors
      const bands = Array.isArray(rasterData)
        ? (rasterData as TypedArray[])
        : [rasterData as TypedArray];
      const pixelCount = width * height;
      const rgbaData = this.convertBandsToRgba(bands, pixelCount);

      return encode(rgbaData, width, height);
    } catch (error) {
      let message: string;
      if (error instanceof Error) {
        message = error.message;
      } else if (typeof error === "string") {
        message = error;
      } else {
        message = `Unknown error: ${String(error)}`;
      }
      throw new Error(`GeoTIFF query error: ${message}`);
    }
  }

  private needsNormalization(data: TypedArray): boolean {
    if (data instanceof Uint8Array) return false;
    if (data instanceof Uint16Array) return true;
    if (data instanceof Int16Array) return true;
    if (data instanceof Float32Array) return true;
    return true; // default to safe normalization
  }

  private normalizeToUint8(data: TypedArray): Uint8Array {
    if (data instanceof Uint8Array) {
      return data; // Already in correct range
    }

    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < data.length; i++) {
      const value = Number(data[i]);
      if (value < min) min = value;
      if (value > max) max = value;
    }

    const range = max - min;
    const normalized = new Uint8Array(data.length);

    if (range === 0) {
      const value = min > 255 ? 255 : min < 0 ? 0 : min;
      normalized.fill(value);
      return normalized;
    }

    for (let i = 0; i < data.length; i++) {
      normalized[i] = Math.round(((Number(data[i]) - min) / range) * 255);
    }

    return normalized;
  }

  private convertBandsToRgba(
    bands: TypedArray[],
    pixelCount: number
  ): Uint8Array {
    const rgbaPixels = new Uint8Array(pixelCount * 4);
    const numBands = bands.length;

    // Normalize each band if needed
    const normalizedBands = bands.map((band) =>
      this.needsNormalization(band)
        ? this.normalizeToUint8(band)
        : (band as Uint8Array)
    );

    for (let i = 0; i < pixelCount; i++) {
      const baseIndex = i * 4;

      if (numBands >= 3) {
        // RGB data - use original colors
        rgbaPixels[baseIndex] = normalizedBands[0][i]; // Red
        rgbaPixels[baseIndex + 1] = normalizedBands[1][i]; // Green
        rgbaPixels[baseIndex + 2] = normalizedBands[2][i]; // Blue
        rgbaPixels[baseIndex + 3] = 255; // Alpha (opaque)
      } else {
        // Grayscale data - replicate across RGB channels
        const grayscale = normalizedBands[0][i];
        rgbaPixels[baseIndex] = grayscale; // Red
        rgbaPixels[baseIndex + 1] = grayscale; // Green
        rgbaPixels[baseIndex + 2] = grayscale; // Blue
        rgbaPixels[baseIndex + 3] = 255; // Alpha (opaque)
      }
    }

    return rgbaPixels;
  }

  private validateBounds(
    requestedBbox: [number, number, number, number],
    metadata: { bounds: [number, number, number, number] }
  ): { isValid: boolean; error?: string } {
    const [reqMinX, reqMinY, reqMaxX, reqMaxY] = requestedBbox;
    const [geoMinX, geoMinY, geoMaxX, geoMaxY] = metadata.bounds;

    if (
      reqMinX < geoMinX ||
      reqMaxX > geoMaxX ||
      reqMinY < geoMinY ||
      reqMaxY > geoMaxY
    ) {
      return {
        isValid: false,
        error: `Requested bbox [${requestedBbox.join(", ")}] exceeds GeoTIFF bounds [${metadata.bounds.join(", ")}]`,
      };
    }

    return { isValid: true };
  }
}
