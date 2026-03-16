import { PhotonImage } from "@cf-wasm/photon";
import type { ImageParameter } from "@dafthunk/runtime";
import type { NodeExecution } from "@dafthunk/types";

interface PhotonNode {
  createSuccessResult: (
    outputs: Record<string, unknown>,
    usage?: number
  ) => NodeExecution;
  createErrorResult: (error: string) => NodeExecution;
}

/**
 * Validates a single image input, creates a PhotonImage, runs the
 * operation callback, extracts output bytes, and frees all Photon
 * resources. Nodes supply only their specific operation logic.
 *
 * The callback receives the PhotonImage and must return output bytes.
 * For in-place mutations: call the photon function, then `photonImage.get_bytes()`.
 * For functions that return a new PhotonImage: get bytes from the new image,
 * free it, and return the bytes.
 */
export function executePhotonOperation(
  node: PhotonNode,
  image: ImageParameter | undefined,
  operation: (photonImage: PhotonImage) => Uint8Array
): NodeExecution {
  if (!image || !image.data || !image.mimeType) {
    return node.createErrorResult("Input image is missing or invalid.");
  }

  let photonImage: PhotonImage | undefined;
  try {
    photonImage = PhotonImage.new_from_byteslice(image.data);
    const outputBytes = operation(photonImage);

    if (!outputBytes || outputBytes.length === 0) {
      return node.createErrorResult(
        "Photon operation resulted in empty image data."
      );
    }

    return node.createSuccessResult({
      image: { data: outputBytes, mimeType: "image/png" },
    });
  } catch (error) {
    return node.createErrorResult(
      error instanceof Error ? error.message : "Unknown error"
    );
  } finally {
    if (photonImage) photonImage.free();
  }
}

/**
 * Two-image variant for operations like blend and watermark.
 * Validates both images, creates both PhotonImages, runs the operation,
 * and frees all resources.
 */
export function executePhotonDualImageOperation(
  node: PhotonNode,
  imageA: ImageParameter | undefined,
  imageB: ImageParameter | undefined,
  labelA: string,
  labelB: string,
  operation: (a: PhotonImage, b: PhotonImage) => Uint8Array
): NodeExecution {
  if (!imageA || !imageA.data || !imageA.mimeType) {
    return node.createErrorResult(`${labelA} is missing or invalid.`);
  }
  if (!imageB || !imageB.data || !imageB.mimeType) {
    return node.createErrorResult(`${labelB} is missing or invalid.`);
  }

  let photonA: PhotonImage | undefined;
  let photonB: PhotonImage | undefined;
  try {
    photonA = PhotonImage.new_from_byteslice(imageA.data);
    photonB = PhotonImage.new_from_byteslice(imageB.data);
    const outputBytes = operation(photonA, photonB);

    if (!outputBytes || outputBytes.length === 0) {
      return node.createErrorResult(
        "Photon operation resulted in empty image data."
      );
    }

    return node.createSuccessResult({
      image: { data: outputBytes, mimeType: "image/png" },
    });
  } catch (error) {
    return node.createErrorResult(
      error instanceof Error ? error.message : "Unknown error"
    );
  } finally {
    if (photonA) photonA.free();
    if (photonB) photonB.free();
  }
}
