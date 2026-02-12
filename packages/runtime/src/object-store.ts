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
  listObjects(organizationId: string): Promise<ObjectMetadata[]>;
}
