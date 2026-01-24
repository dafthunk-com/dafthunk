/**
 * Mock Object Store
 *
 * In-memory implementation of ObjectStore for testing.
 * Stores objects in memory without requiring R2 bucket access.
 */

import type { ObjectReference } from "@dafthunk/types";
import { v7 as uuid } from "uuid";

import type {
  ObjectInfo,
  ObjectStore,
  PresignedUrlConfig,
} from "../runtime/ports";

interface StoredObject {
  data: Uint8Array;
  mimeType: string;
  organizationId: string;
  executionId?: string;
  filename?: string;
  createdAt: Date;
}

export class MockObjectStore implements ObjectStore {
  private objects: Map<string, StoredObject> = new Map();

  async writeObject(
    data: Uint8Array,
    mimeType: string,
    organizationId: string,
    executionId?: string,
    filename?: string
  ): Promise<ObjectReference> {
    const id = uuid();
    return this.writeObjectWithId(
      id,
      data,
      mimeType,
      organizationId,
      executionId,
      filename
    );
  }

  async writeObjectWithId(
    id: string,
    data: Uint8Array,
    mimeType: string,
    organizationId: string,
    executionId?: string,
    filename?: string
  ): Promise<ObjectReference> {
    this.objects.set(id, {
      data,
      mimeType,
      organizationId,
      executionId,
      filename,
      createdAt: new Date(),
    });

    const result: ObjectReference = { id, mimeType };
    if (filename) {
      result.filename = filename;
    }
    return result;
  }

  async readObject(
    reference: ObjectReference
  ): Promise<{ data: Uint8Array; metadata: Record<string, string> } | null> {
    const stored = this.objects.get(reference.id);
    if (!stored) {
      return null;
    }

    const metadata: Record<string, string> = {
      id: reference.id,
      organizationId: stored.organizationId,
      createdAt: stored.createdAt.toISOString(),
    };
    if (stored.executionId) {
      metadata.executionId = stored.executionId;
    }
    if (stored.filename) {
      metadata.filename = stored.filename;
    }

    return {
      data: stored.data,
      metadata,
    };
  }

  async deleteObject(reference: ObjectReference): Promise<void> {
    this.objects.delete(reference.id);
  }

  async getPresignedUrl(
    reference: ObjectReference,
    _expiresInSeconds?: number
  ): Promise<string> {
    // Return a mock URL for testing
    return `https://mock-r2.example.com/objects/${reference.id}/object.data`;
  }

  async getPresignedUploadUrl(
    reference: ObjectReference,
    _expiresInSeconds?: number
  ): Promise<string> {
    // Return a mock URL for testing
    return `https://mock-r2.example.com/upload/objects/${reference.id}/object.data`;
  }

  async listObjects(organizationId: string): Promise<ObjectInfo[]> {
    const results: ObjectInfo[] = [];

    for (const [id, stored] of this.objects.entries()) {
      if (stored.organizationId === organizationId) {
        results.push({
          id,
          mimeType: stored.mimeType,
          size: stored.data.length,
          createdAt: stored.createdAt,
          organizationId: stored.organizationId,
          executionId: stored.executionId,
        });
      }
    }

    return results;
  }

  configurePresignedUrls(_config: PresignedUrlConfig): void {
    // No-op for mock - presigned URLs work without configuration
  }

  /**
   * Get all stored objects for test verification
   */
  getAll(): Map<string, StoredObject> {
    return new Map(this.objects);
  }

  /**
   * Clear all stored objects
   */
  clear(): void {
    this.objects.clear();
  }
}
