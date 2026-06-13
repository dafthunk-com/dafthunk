/**
 * Image helpers shared by AI nodes that send images to provider APIs.
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
