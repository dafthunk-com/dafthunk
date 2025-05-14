/**
 * Utility functions for handling binary data in workflow nodes
 */

import { API_BASE_URL } from "@/config/api";
import {
  ObjectReference,
  UploadObjectResponse,
  GetObjectMetadataResponse,
  ListObjectsResponse,
  DeleteObjectResponse,
  ObjectMetadata,
} from "@dafthunk/types";
import { useAuth } from "@/components/authContext";
import { useCallback } from "react";

/**
 * Binary data types supported for operations
 */
export type BinaryData = Uint8Array | ArrayBuffer | number[] | string;

/**
 * React hook that provides object service functions with the current organization context
 */
export const useObjectService = () => {
  const { organization } = useAuth();

  const organizationId = organization?.id || "";
  const organizationHandle = organization?.handle || "";

  const createUrl = useCallback(
    (objectReference: ObjectReference): string => {
      return createObjectUrl(
        objectReference,
        organizationId,
        organizationHandle
      );
    },
    [organizationId, organizationHandle]
  );

  const uploadData = useCallback(
    async (data: BinaryData, mimeType: string): Promise<ObjectReference> => {
      return uploadBinaryData(
        data,
        mimeType,
        organizationId,
        organizationHandle
      );
    },
    [organizationId, organizationHandle]
  );

  const getMetadata = useCallback(
    async (objectId: string, mimeType: string): Promise<ObjectMetadata> => {
      return getObjectMetadata(
        objectId,
        mimeType,
        organizationId,
        organizationHandle
      );
    },
    [organizationId, organizationHandle]
  );

  const listAllObjects = useCallback(async (): Promise<ObjectMetadata[]> => {
    return listObjects(organizationId, organizationHandle);
  }, [organizationId, organizationHandle]);

  const deleteObj = useCallback(
    async (objectId: string, mimeType: string): Promise<boolean> => {
      return deleteObject(
        objectId,
        mimeType,
        organizationId,
        organizationHandle
      );
    },
    [organizationId, organizationHandle]
  );

  return {
    createObjectUrl: createUrl,
    uploadBinaryData: uploadData,
    getObjectMetadata: getMetadata,
    listObjects: listAllObjects,
    deleteObject: deleteObj,
    organizationId,
  };
};

/**
 * Builds the URL for object operations with the organization context
 */
export const buildObjectApiUrl = (
  organizationId: string,
  path: string = "",
  organizationHandle: string = ""
): string => {
  if (!organizationHandle) {
    console.warn("No organization handle provided for object API URL");
    return `${API_BASE_URL}/objects${path}`;
  }

  const finalUrl = `${API_BASE_URL}/${organizationHandle}/objects${path}`;
  console.log("Building API URL:", finalUrl, {
    organizationId,
    organizationHandle,
  });
  return finalUrl;
};

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
 * @param organizationId - The organization ID
 * @param organizationHandle - The organization handle
 * @returns A URL to the object
 */
export const createObjectUrl = (
  objectReference: ObjectReference,
  organizationId: string,
  organizationHandle: string = ""
): string => {
  if (!objectReference?.id || !objectReference?.mimeType) {
    throw new Error("Invalid object reference: must include id and mimeType");
  }

  const baseUrl = buildObjectApiUrl(organizationId, "", organizationHandle);
  return `${baseUrl}?id=${encodeURIComponent(objectReference.id)}&mimeType=${encodeURIComponent(objectReference.mimeType)}`;
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
 * @param organizationId - The organization ID
 * @param organizationHandle - The organization handle
 * @returns A promise that resolves to an object reference {id, mimeType}
 */
export const uploadBinaryData = async (
  data: BinaryData,
  mimeType: string,
  organizationId: string,
  organizationHandle: string = ""
): Promise<ObjectReference> => {
  if (!data) {
    throw new Error("No data provided for upload");
  }

  if (!mimeType) {
    throw new Error("MIME type is required for upload");
  }

  if (!organizationId) {
    throw new Error("Organization ID is required for upload");
  }

  if (!organizationHandle) {
    throw new Error("Organization handle is required for upload");
  }

  // Convert to blob
  const blob = binaryDataToBlob(data, mimeType);

  // Create form data
  const formData = new FormData();
  formData.append("file", blob);

  console.log(
    `Uploading to ${buildObjectApiUrl(organizationId, "", organizationHandle)}`
  );

  // Upload to objects endpoint with organization context
  const response = await fetch(
    buildObjectApiUrl(organizationId, "", organizationHandle),
    {
      method: "POST",
      body: formData,
      credentials: "include",
      headers: {
        // Intentionally NOT setting Content-Type for FormData
        // Browser will set it with the proper boundary
      },
    }
  );

  if (!response.ok) {
    console.error("Upload failed:", response.status, response.statusText);
    throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
  }

  const result = (await response.json()) as UploadObjectResponse;

  if (!result.reference?.id || !result.reference?.mimeType) {
    throw new Error("Invalid response from server");
  }

  return result.reference;
};

/**
 * Retrieves metadata for an object
 *
 * @param objectId - The ID of the object
 * @param mimeType - The MIME type of the object
 * @param organizationId - The organization ID
 * @param organizationHandle - The organization handle
 * @returns A promise that resolves to the object metadata
 */
export const getObjectMetadata = async (
  objectId: string,
  mimeType: string,
  organizationId: string,
  organizationHandle: string = ""
): Promise<ObjectMetadata> => {
  if (!objectId || !mimeType) {
    throw new Error("Object ID and MIME type are required");
  }

  if (!organizationId) {
    throw new Error("Organization ID is required");
  }

  if (!organizationHandle) {
    throw new Error("Organization handle is required");
  }

  const url = `${buildObjectApiUrl(organizationId, `/metadata/${objectId}`, organizationHandle)}?mimeType=${encodeURIComponent(mimeType)}`;

  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(
      `Failed to get object metadata: ${response.status} ${response.statusText}`
    );
  }

  const result = (await response.json()) as GetObjectMetadataResponse;

  if (!result.metadata) {
    throw new Error("Invalid response from server");
  }

  return result.metadata;
};

/**
 * Lists all objects for the organization
 *
 * @param organizationId - The organization ID
 * @param organizationHandle - The organization handle
 * @returns A promise that resolves to an array of object metadata
 */
export const listObjects = async (
  organizationId: string,
  organizationHandle: string = ""
): Promise<ObjectMetadata[]> => {
  if (!organizationId) {
    throw new Error("Organization ID is required");
  }

  if (!organizationHandle) {
    throw new Error("Organization handle is required");
  }

  const url = buildObjectApiUrl(organizationId, `/list`, organizationHandle);

  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(
      `Failed to list objects: ${response.status} ${response.statusText}`
    );
  }

  const result = (await response.json()) as ListObjectsResponse;

  return result.objects || [];
};

/**
 * Deletes an object
 *
 * @param objectId - The ID of the object
 * @param mimeType - The MIME type of the object
 * @param organizationId - The organization ID
 * @param organizationHandle - The organization handle
 * @returns A promise that resolves to true if deletion was successful
 */
export const deleteObject = async (
  objectId: string,
  mimeType: string,
  organizationId: string,
  organizationHandle: string = ""
): Promise<boolean> => {
  if (!objectId || !mimeType) {
    throw new Error("Object ID and MIME type are required");
  }

  if (!organizationId) {
    throw new Error("Organization ID is required");
  }

  if (!organizationHandle) {
    throw new Error("Organization handle is required");
  }

  const url = `${buildObjectApiUrl(organizationId, `/${objectId}`, organizationHandle)}?mimeType=${encodeURIComponent(mimeType)}`;

  const response = await fetch(url, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(
      `Failed to delete object: ${response.status} ${response.statusText}`
    );
  }

  const result = (await response.json()) as DeleteObjectResponse;

  return result.success || false;
};
