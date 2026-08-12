/**
 * Image helpers shared by nodes that send images to provider APIs.
 */

/** An image whose data may already be base64-encoded or still raw bytes. */
export interface EncodableImage {
  data: Uint8Array | ArrayBuffer | string;
  mimeType?: string;
}

/** Returns the image data as a base64 string, encoding raw bytes if needed. */
export function imageToBase64(image: EncodableImage): string {
  if (typeof image.data === "string") {
    return image.data;
  }
  const buffer = new Uint8Array(image.data);
  return btoa(
    buffer.reduce((data, byte) => data + String.fromCharCode(byte), "")
  );
}

/** An image resolved from a node input, ready to upload. */
export interface UploadableImage {
  data: Uint8Array;
  mimeType: string;
  filename?: string;
}

/**
 * Reads an optional image input. Returns `{}` when the input is absent,
 * `{ image }` when it is a resolved blob, and `{ error }` when something is
 * connected but did not resolve to one — callers pass the message straight
 * to `createErrorResult` so the failure names the node that saw it.
 */
export function readOptionalImage(value: unknown): {
  image?: UploadableImage;
  error?: string;
} {
  if (value === undefined || value === null) {
    return {};
  }
  if (
    typeof value !== "object" ||
    !("data" in value) ||
    !(value.data instanceof Uint8Array) ||
    !("mimeType" in value) ||
    typeof value.mimeType !== "string"
  ) {
    return { error: "Image input is missing or invalid" };
  }
  const filename =
    "filename" in value && typeof value.filename === "string"
      ? value.filename
      : undefined;
  return { image: { data: value.data, mimeType: value.mimeType, filename } };
}

/**
 * Filename to send with a multipart upload. Recipients see this name, and
 * several providers reject uploads whose filename has no extension, so
 * derive one from the mime subtype rather than sending a bare base.
 */
export function imageFilename(image: UploadableImage, base = "image"): string {
  if (image.filename) {
    return image.filename;
  }
  const subtype = image.mimeType.split("/")[1]?.split("+")[0] || "png";
  return `${base}.${subtype}`;
}

/**
 * Message describing an over-limit image, or undefined when it fits.
 * Providers reject oversized media with opaque errors (often a bare 413),
 * so the size is worth checking before spending the upload round-trip.
 */
export function imageSizeError(
  image: UploadableImage,
  maxBytes: number,
  provider: string
): string | undefined {
  if (image.data.byteLength <= maxBytes) {
    return undefined;
  }
  const megabytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `Image is ${megabytes(image.data.byteLength)}, which exceeds the ${provider} limit of ${megabytes(maxBytes)}`;
}
