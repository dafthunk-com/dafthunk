import { v4 as uuidv4 } from 'uuid';
import type { R2Bucket } from '@cloudflare/workers-types';

export interface StoreObject {
  id: string;
  data: Uint8Array;
  mimeType: string;
  size: number;
  createdAt: Date;
}

export interface ObjectReference {
  id: string;
  mimeType: string;
}

export class ObjectStore {
  private bucket: R2Bucket;

  constructor(bucket: R2Bucket) {
    this.bucket = bucket;
  }

  /**
   * Write a binary object to storage and return a reference
   */
  async write(data: Uint8Array, mimeType: string): Promise<ObjectReference> {
    const id = uuidv4();
    const key = `objects/${id}`;

    await this.bucket.put(key, data, {
      httpMetadata: {
        contentType: mimeType,
        cacheControl: 'public, max-age=31536000',
      },
      customMetadata: {
        id,
        createdAt: new Date().toISOString(),
      },
    });

    return {
      id,
      mimeType,
    };
  }

  /**
   * Read an object from storage using its reference
   */
  async read(reference: ObjectReference): Promise<Uint8Array> {
    const object = await this.readObject(reference.id);
    if (!object) {
      throw new Error(`Object not found: ${reference.id}`);
    }
    return object.data;
  }

  /**
   * Delete an object from storage using its reference
   */
  async delete(reference: ObjectReference): Promise<void> {
    await this.deleteObject(reference.id);
  }

  /**
   * Read raw object data from storage
   */
  private async readObject(id: string): Promise<StoreObject | null> {
    const key = `objects/${id}`;
    const object = await this.bucket.get(key);

    if (!object) {
      return null;
    }

    const data = await object.arrayBuffer();
    const metadata = object.customMetadata || {};

    return {
      id: metadata.id || id,
      data: new Uint8Array(data),
      mimeType: object.httpMetadata?.contentType || 'application/octet-stream',
      size: object.size,
      createdAt: new Date(metadata.createdAt || object.uploaded),
    };
  }

  /**
   * Delete raw object data from storage
   */
  private async deleteObject(id: string): Promise<void> {
    const key = `objects/${id}`;
    await this.bucket.delete(key);
  }
} 