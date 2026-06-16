import type { ObjectReference } from "@dafthunk/types";

/**
 * Metadata for a stored object.
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
 * Object store abstraction for binary object storage and retrieval.
 */
export interface ObjectStore {
  writeObject(
    data: Uint8Array,
    mimeType: string,
    organizationId: string,
    executionId?: string,
    filename?: string
  ): Promise<ObjectReference>;
  writeObjectWithId(
    id: string,
    data: Uint8Array,
    mimeType: string,
    organizationId: string,
    executionId?: string,
    filename?: string
  ): Promise<ObjectReference>;
  readObject(reference: ObjectReference): Promise<{
    data: Uint8Array;
    metadata: Record<string, string> | undefined;
  } | null>;
  deleteObject(reference: ObjectReference): Promise<void>;
  getPresignedUrl(
    reference: ObjectReference,
    expiresInSeconds?: number
  ): Promise<string>;
  writeAndPresign(
    data: Uint8Array,
    mimeType: string,
    organizationId: string,
    expiresInSeconds?: number
  ): Promise<string>;
  /**
   * Reserve an object id and return a presigned PUT URL an external service can
   * upload to directly (no bytes are written yet). The returned `reference`
   * resolves the same object once the upload completes, so callers can
   * `readObject(reference)` to fetch the produced file. Used for provider
   * "upload destination" flows (e.g. Cloudflare Gateway video models that
   * require `output.upload_url`).
   */
  presignUpload(
    mimeType: string,
    organizationId: string,
    expiresInSeconds?: number
  ): Promise<{ uploadUrl: string; reference: ObjectReference }>;
  listObjects(organizationId: string): Promise<ObjectMetadata[]>;
}
