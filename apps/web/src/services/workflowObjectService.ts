/**
 * Utility functions for handling binary data in workflow nodes
 */

import { API_BASE_URL } from "@/config/api";
import { ObjectReference } from "@dafthunk/types";

/**
 * Binary data types supported for operations
 */
export type BinaryData = Uint8Array | ArrayBuffer | number[] | string;

/**
 * Converts a Uint8Array to a base64 string
 *
 * @param buffer - The buffer to convert
 * @returns A base64 encoded string representation of the buffer
 */
export const arrayBufferToBase64 = (buffer: BinaryData): string => {
  if (!buffer || (Array.isArray(buffer) && buffer.length === 0)) {
    throw new Error("Invalid or empty buffer");
  }

  // Handle different input types to ensure we have a Uint8Array
  const bytes =
    buffer instanceof Uint8Array
      ? buffer
      : typeof buffer === "string"
        ? new TextEncoder().encode(buffer)
        : new Uint8Array(
            Array.isArray(buffer) ? buffer : Object.values(buffer)
          );

  // Convert Uint8Array to a binary string
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  // Convert binary string to base64
  return window.btoa(binary);
};

/**
 * Creates a data URL from binary data and a MIME type
 *
 * @param buffer - The binary data
 * @param mimeType - The MIME type of the data (e.g., 'image/png')
 * @returns A data URL that can be used in img src attributes
 */
export const createDataUrl = (buffer: BinaryData, mimeType: string): string => {
  if (!buffer || !mimeType) {
    throw new Error("Buffer and MIME type are required");
  }

  const base64 = arrayBufferToBase64(buffer);
  return `data:${mimeType};base64,${base64}`;
};

/**
 * Creates a URL to an object stored in R2 via the /objects endpoint
 *
 * @param objectReference - The object reference with id and mimeType
 * @returns A URL to the object
 */
export const createObjectUrl = (objectReference: ObjectReference): string => {
  if (!objectReference?.id || !objectReference?.mimeType) {
    throw new Error("Invalid object reference: must include id and mimeType");
  }

  return `${API_BASE_URL}/objects?id=${encodeURIComponent(objectReference.id)}&mimeType=${encodeURIComponent(objectReference.mimeType)}`;
};

/**
 * Determines if a value is an object reference
 *
 * @param value - The value to check
 * @returns True if the value appears to be an object reference
 */
export const isObjectReference = (value: unknown): value is ObjectReference => {
  return (
    value !== null &&
    typeof value === "object" &&
    "id" in value &&
    typeof (value as ObjectReference).id === "string" &&
    "mimeType" in value &&
    typeof (value as ObjectReference).mimeType === "string"
  );
};

/**
 * Converts a base64 string to a Uint8Array
 *
 * @param base64 - Base64 encoded string
 * @returns A Uint8Array of the decoded data
 */
export const base64ToUint8Array = (base64: string): Uint8Array => {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes;
};

/**
 * Converts binary data to a Blob
 *
 * @param data - Binary data in various formats
 * @param mimeType - The MIME type to use for the Blob
 * @returns A Blob representing the data
 */
const binaryDataToBlob = (data: BinaryData, mimeType: string): Blob => {
  if (typeof data === "string") {
    // Assume it's base64 if it's a string
    const bytes = base64ToUint8Array(data);
    return new Blob([bytes], { type: mimeType });
  }

  if (data instanceof Uint8Array || data instanceof ArrayBuffer) {
    return new Blob([data], { type: mimeType });
  }

  // For number arrays or other array-like objects
  return new Blob(
    [new Uint8Array(Array.isArray(data) ? data : Object.values(data))],
    { type: mimeType }
  );
};

/**
 * Uploads binary data to the object store and returns an object reference
 *
 * @param data - Binary data in various formats
 * @param mimeType - The MIME type of the data
 * @returns A promise that resolves to an object reference {id, mimeType}
 */
export const uploadBinaryData = async (
  data: BinaryData,
  mimeType: string
): Promise<ObjectReference> => {
  if (!data) {
    throw new Error("No data provided for upload");
  }

  if (!mimeType) {
    throw new Error("MIME type is required for upload");
  }

  // Convert to blob
  const blob = binaryDataToBlob(data, mimeType);

  // Create form data
  const formData = new FormData();
  formData.append("file", blob);

  // Upload to objects endpoint
  const response = await fetch(`${API_BASE_URL}/objects`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();

  if (!result.reference?.id || !result.reference?.mimeType) {
    throw new Error("Invalid response from server");
  }

  return result.reference;
};
