/**
 * Utility functions for handling binary data in workflow nodes
 */

/**
 * Converts a Uint8Array to a base64 string
 * Used for displaying binary data like images in the UI
 *
 * @param buffer - The Uint8Array buffer to convert
 * @returns A base64 encoded string representation of the buffer
 */
export const arrayBufferToBase64 = (
  buffer: Uint8Array | number[] | any
): string => {
  try {
    // Check if buffer is valid
    if (!buffer || buffer.length === 0) {
      throw new Error("Invalid or empty buffer");
    }

    // Handle case where buffer might be serialized as an array of numbers
    // This happens when Uint8Array is sent from server to client
    const bytes =
      buffer instanceof Uint8Array
        ? buffer
        : new Uint8Array(
            Array.isArray(buffer) ? buffer : Object.values(buffer)
          );

    // Convert Uint8Array to a string of binary data
    let binary = "";
    const len = bytes.byteLength;

    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }

    // Convert binary string to base64
    return window.btoa(binary);
  } catch (error) {
    console.error("Error converting array buffer to base64:", error);
    throw error;
  }
};

/**
 * Creates a data URL from binary data and a MIME type
 *
 * @param buffer - The binary data as a Uint8Array or array-like object
 * @param mimeType - The MIME type of the data (e.g., 'image/png')
 * @returns A data URL that can be used in img src attributes
 */
export const createDataUrl = (
  buffer: Uint8Array | number[] | any,
  mimeType: string
): string => {
  try {
    const base64 = arrayBufferToBase64(buffer);
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error("Error creating data URL:", error);
    throw error;
  }
};
