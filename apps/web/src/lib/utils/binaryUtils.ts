/**
 * Utility functions for handling binary data in workflow nodes
 */

import { API_BASE_URL } from "@/config/api";

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

    // Log detailed buffer information for debugging
    console.log(
      `Converting buffer to base64. Type: ${buffer.constructor.name}, Length: ${buffer.length}`
    );

    // Handle case where buffer might be serialized as an array of numbers
    // This happens when Uint8Array is sent from server to client
    const bytes =
      buffer instanceof Uint8Array
        ? buffer
        : new Uint8Array(
            Array.isArray(buffer) ? buffer : Object.values(buffer)
          );

    // For debugging, log the first few bytes
    const previewBytes = Array.from(bytes.slice(0, 16))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(" ");
    console.log(`First 16 bytes: ${previewBytes}`);

    // Convert Uint8Array to a string of binary data
    let binary = "";
    const len = bytes.byteLength;

    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }

    // Convert binary string to base64
    const base64 = window.btoa(binary);
    console.log(
      `Base64 string length: ${base64.length}, preview: ${base64.substring(0, 20)}...`
    );
    return base64;
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
    // For audio data specifically, add extra validation
    if (mimeType.startsWith("audio/")) {
      console.log(
        `Creating audio data URL for ${mimeType} content, buffer length: ${buffer.length}`
      );

      // Check if this looks like valid audio data (MP3 files typically start with ID3 or binary sync markers)
      if (Array.isArray(buffer) && buffer.length > 4) {
        // Check for MP3 sync frame header (0xFF 0xFB) or ID3 tag ("ID3")
        const hasMP3Header = buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0;
        const hasID3Header =
          buffer[0] === 73 && buffer[1] === 68 && buffer[2] === 51; // "ID3"

        if (!hasMP3Header && !hasID3Header) {
          console.warn("Audio data doesn't appear to have a valid MP3 header", {
            firstBytes: buffer.slice(0, 10),
          });
        }
      }
    }

    const base64 = arrayBufferToBase64(buffer);
    const dataUrl = `data:${mimeType};base64,${base64}`;

    // For debugging, log a preview of the data URL
    console.log(
      `Created data URL with MIME type ${mimeType}, length: ${dataUrl.length}`
    );

    return dataUrl;
  } catch (error) {
    console.error("Error creating data URL:", error, {
      bufferType: buffer?.constructor?.name,
      bufferLength: buffer?.length,
      mimeType,
    });
    throw error;
  }
};

/**
 * Creates a URL to an object stored in R2 via the /objects endpoint
 *
 * @param objectReference - The object reference with id and mimeType
 * @returns A URL to the object that can be used in img src, audio src, etc.
 */
export const createObjectUrl = (objectReference: {
  id: string;
  mimeType: string;
}): string => {
  try {
    if (!objectReference || !objectReference.id || !objectReference.mimeType) {
      throw new Error("Invalid object reference: must include id and mimeType");
    }

    // Create URL with the object ID and mimeType as query parameters
    const url = `${API_BASE_URL}/objects?id=${encodeURIComponent(objectReference.id)}&mimeType=${encodeURIComponent(objectReference.mimeType)}`;

    console.log(
      `Created object URL for ${objectReference.mimeType} object: ${url}`
    );

    return url;
  } catch (error) {
    console.error("Error creating object URL:", error);
    throw error;
  }
};

/**
 * Determines if a value is an object reference
 *
 * @param value - The value to check
 * @returns True if the value appears to be an object reference
 */
export const isObjectReference = (value: any): boolean => {
  return (
    value &&
    typeof value === "object" &&
    typeof value.id === "string" &&
    typeof value.mimeType === "string"
  );
};

/**
 * Uploads binary data to the object store and returns an object reference
 *
 * @param data - Binary data as Uint8Array, ArrayBuffer, or base64 string
 * @param mimeType - The MIME type of the data
 * @returns A promise that resolves to an object reference {id, mimeType}
 */
export const uploadBinaryData = async (
  data: Uint8Array | ArrayBuffer | string,
  mimeType: string
): Promise<{ id: string; mimeType: string }> => {
  try {
    console.log(`Uploading binary data of type ${mimeType}`);

    // Convert data to Blob based on its type
    let blob: Blob;
    if (typeof data === "string") {
      // If data is a base64 string, convert it to a Blob
      const byteCharacters = atob(data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      blob = new Blob([byteArray], { type: mimeType });
    } else if (data instanceof Uint8Array) {
      blob = new Blob([data], { type: mimeType });
    } else if (data instanceof ArrayBuffer) {
      blob = new Blob([data], { type: mimeType });
    } else {
      throw new Error("Unsupported data type for upload");
    }

    // Create form data
    const formData = new FormData();
    formData.append("file", blob);

    // Upload to objects endpoint
    const response = await fetch(`${API_BASE_URL}/objects`, {
      method: "POST",
      body: formData,
      credentials: "include",
      headers: {
        // Don't set Content-Type here as the browser will set it correctly with the boundary
      },
    });

    if (!response.ok) {
      throw new Error(
        `Upload failed: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();
    if (
      !result.reference ||
      !result.reference.id ||
      !result.reference.mimeType
    ) {
      throw new Error("Invalid response from server");
    }

    console.log(
      `Successfully uploaded object. Received reference: ${result.reference.id}`
    );
    return result.reference;
  } catch (error) {
    console.error("Error uploading binary data:", error);
    throw error;
  }
};
