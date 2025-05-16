/**
 * Represents an object record with metadata
 */
export interface ObjectMetadata {
  id: string;
  mimeType: string;
  size: number;
  createdAt: Date;
  organizationId: string;
  executionId?: string;
}

/**
 * Response when uploading an object
 */
export interface UploadObjectResponse {
  reference: {
    id: string;
    mimeType: string;
  };
}

/**
 * Response when retrieving an object's metadata
 */
export interface GetObjectMetadataResponse {
  metadata: ObjectMetadata;
}

/**
 * Response when listing objects
 */
export interface ListObjectsResponse {
  objects: ObjectMetadata[];
}

/**
 * Response when deleting an object
 */
export interface DeleteObjectResponse {
  success: boolean;
}
