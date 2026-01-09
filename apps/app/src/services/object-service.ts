/**
 * Utility functions for handling binary data in workflow nodes
 */

import {
  DeleteObjectResponse,
  GetObjectMetadataResponse,
  ListObjectsResponse,
  ObjectMetadata,
  ObjectReference,
  UploadObjectResponse,
} from "@dafthunk/types";
import { useCallback } from "react";

import { useAuth } from "@/components/auth-context";
import { getApiBaseUrl } from "@/config/api";

import { makeOrgRequest } from "./utils";

// Base endpoint for object operations
const API_ENDPOINT_BASE = "/objects";

/**
 * Binary data types supported for operations
 */
export type BinaryData = Uint8Array | ArrayBuffer | number[] | string;

/**
 * React hook that provides object service functions with the current organization context
 */
export const useObjectService = () => {
  const { organization } = useAuth();

  const organizationId = organization?.id ?? "";
  const organizationHandle = organization?.handle ?? "";

  const createUrl = useCallback(
    (objectReference: ObjectReference): string => {
      return createObjectUrl(objectReference, organizationHandle);
    },
    [organizationHandle]
  );

  const uploadData = useCallback(
    async (data: BinaryData, mimeType: string): Promise<ObjectReference> => {
      return uploadBinaryData(data, mimeType, organizationHandle);
    },
    [organizationHandle]
  );

  const getMetadata = useCallback(
    async (objectId: string, mimeType: string): Promise<ObjectMetadata> => {
      return getObjectMetadata(objectId, mimeType, organizationHandle);
    },
    [organizationHandle]
  );

  const listAllObjects = useCallback(async (): Promise<ObjectMetadata[]> => {
    return listObjects(organizationHandle);
  }, [organizationHandle]);

  const deleteObj = useCallback(
    async (objectId: string, mimeType: string): Promise<boolean> => {
      return deleteObject(objectId, mimeType, organizationHandle);
    },
    [organizationHandle]
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
  path: string = "",
  organizationHandle: string = ""
): string => {
  if (!organizationHandle) {
    console.warn("No organization handle provided for object API URL");
    return `${getApiBaseUrl()}${API_ENDPOINT_BASE}${path}`;
  }

  return `${getApiBaseUrl()}/${organizationHandle}${API_ENDPOINT_BASE}${path}`;
};

/**
 * Creates a URL to an object stored in R2 via the /objects endpoint
 *
 * @param objectReference - The object reference with id and mimeType
 * @param organizationHandle - The organization handle
 * @returns A URL to the object
 */
export const createObjectUrl = (
  objectReference: ObjectReference,
  organizationHandle: string = ""
): string => {
  if (!objectReference?.id || !objectReference?.mimeType) {
    throw new Error("Invalid object reference: must include id and mimeType");
  }

  const baseUrl = buildObjectApiUrl("", organizationHandle);
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
    return new Blob([bytes as BlobPart], { type: mimeType });
  }

  if (data instanceof Uint8Array || data instanceof ArrayBuffer) {
    return new Blob([data as BlobPart], { type: mimeType });
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
 * @param organizationHandle - The organization handle
 * @returns A promise that resolves to an object reference {id, mimeType}
 */
export const uploadBinaryData = async (
  data: BinaryData,
  mimeType: string,
  organizationHandle: string = ""
): Promise<ObjectReference> => {
  if (!data) {
    throw new Error("No data provided for upload");
  }

  if (!mimeType) {
    throw new Error("MIME type is required for upload");
  }

  if (!organizationHandle) {
    throw new Error("Organization handle is required for upload");
  }

  // Convert to blob
  const blob = binaryDataToBlob(data, mimeType);

  // Create form data
  const formData = new FormData();
  formData.append("file", blob);

  // Upload to objects endpoint with organization context
  const result = await makeOrgRequest<UploadObjectResponse>(
    organizationHandle,
    API_ENDPOINT_BASE,
    "",
    {
      method: "POST",
      body: formData,
      // Content-Type is handled by makeRequest for FormData
    }
  );

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
 * @param organizationHandle - The organization handle
 * @returns A promise that resolves to the object metadata
 */
export const getObjectMetadata = async (
  objectId: string,
  mimeType: string,
  organizationHandle: string = ""
): Promise<ObjectMetadata> => {
  if (!objectId || !mimeType) {
    throw new Error("Object ID and MIME type are required");
  }

  if (!organizationHandle) {
    throw new Error("Organization handle is required");
  }

  const endpointSuffix = `/metadata/${objectId}?mimeType=${encodeURIComponent(mimeType)}`;

  const result = await makeOrgRequest<GetObjectMetadataResponse>(
    organizationHandle,
    API_ENDPOINT_BASE,
    endpointSuffix,
    {
      method: "GET",
    }
  );

  if (!result.metadata) {
    throw new Error("Invalid response from server");
  }

  return result.metadata;
};

/**
 * Lists all objects for the organization
 *
 * @param organizationHandle - The organization handle
 * @returns A promise that resolves to an array of object metadata
 */
export const listObjects = async (
  organizationHandle: string = ""
): Promise<ObjectMetadata[]> => {
  if (!organizationHandle) {
    throw new Error("Organization handle is required");
  }

  const endpointSuffix = "/list";

  const result = await makeOrgRequest<ListObjectsResponse>(
    organizationHandle,
    API_ENDPOINT_BASE,
    endpointSuffix,
    {
      method: "GET",
    }
  );

  return result.objects || [];
};

/**
 * Deletes an object
 *
 * @param objectId - The ID of the object
 * @param mimeType - The MIME type of the object
 * @param organizationHandle - The organization handle
 * @returns A promise that resolves to true if deletion was successful
 */
export const deleteObject = async (
  objectId: string,
  mimeType: string,
  organizationHandle: string = ""
): Promise<boolean> => {
  if (!objectId || !mimeType) {
    throw new Error("Object ID and MIME type are required");
  }

  if (!organizationHandle) {
    throw new Error("Organization handle is required");
  }

  const endpointSuffix = `/${objectId}?mimeType=${encodeURIComponent(mimeType)}`;

  const result = await makeOrgRequest<DeleteObjectResponse>(
    organizationHandle,
    API_ENDPOINT_BASE,
    endpointSuffix,
    {
      method: "DELETE",
    }
  );

  return result.success || false;
};
