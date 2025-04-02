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
    console.log(`ObjectStore initialized with bucket:`, { bucketExists: !!bucket });
    this.bucket = bucket;
  }

  /**
   * Write a binary object to storage and return a reference
   */
  async write(data: Uint8Array, mimeType: string): Promise<ObjectReference> {
    try {
      console.log(`ObjectStore.write: Starting to write object of type ${mimeType}, size: ${data.length} bytes`);
      
      if (!this.bucket) {
        console.error('ObjectStore.write: R2 bucket is not initialized');
        throw new Error('R2 bucket is not initialized');
      }
      
      const id = uuidv4();
      const key = `objects/${id}`;

      console.log(`ObjectStore.write: Attempting to store object with key ${key}`);
      
      const writeResult = await this.bucket.put(key, data, {
        httpMetadata: {
          contentType: mimeType,
          cacheControl: 'public, max-age=31536000',
        },
        customMetadata: {
          id,
          createdAt: new Date().toISOString(),
        },
      });
      
      console.log(`ObjectStore.write: Successfully stored object ${id}, etag: ${writeResult?.etag || 'unknown'}`);

      return {
        id,
        mimeType,
      };
    } catch (error) {
      console.error('ObjectStore.write: Failed to write object to R2:', error);
      throw error;
    }
  }

  /**
   * Read an object from storage using its reference
   */
  async read(reference: ObjectReference): Promise<Uint8Array> {
    try {
      console.log(`ObjectStore.read: Attempting to read object with id ${reference.id}`);
      
      if (!this.bucket) {
        console.error('ObjectStore.read: R2 bucket is not initialized');
        throw new Error('R2 bucket is not initialized');
      }
      
      const object = await this.readObject(reference.id);
      if (!object) {
        console.error(`ObjectStore.read: Object not found: ${reference.id}`);
        throw new Error(`Object not found: ${reference.id}`);
      }
      
      console.log(`ObjectStore.read: Successfully read object ${reference.id}, size: ${object.data.length} bytes`);
      return object.data;
    } catch (error) {
      console.error(`ObjectStore.read: Failed to read object ${reference.id}:`, error);
      throw error;
    }
  }

  /**
   * Delete an object from storage using its reference
   */
  async delete(reference: ObjectReference): Promise<void> {
    try {
      console.log(`ObjectStore.delete: Attempting to delete object with id ${reference.id}`);
      
      if (!this.bucket) {
        console.error('ObjectStore.delete: R2 bucket is not initialized');
        throw new Error('R2 bucket is not initialized');
      }
      
      await this.deleteObject(reference.id);
      console.log(`ObjectStore.delete: Successfully deleted object ${reference.id}`);
    } catch (error) {
      console.error(`ObjectStore.delete: Failed to delete object ${reference.id}:`, error);
      throw error;
    }
  }

  /**
   * Read raw object data from storage
   */
  private async readObject(id: string): Promise<StoreObject | null> {
    try {
      const key = `objects/${id}`;
      console.log(`ObjectStore.readObject: Getting object with key ${key}`);
      
      const object = await this.bucket.get(key);

      if (!object) {
        console.log(`ObjectStore.readObject: Object not found with key ${key}`);
        return null;
      }

      console.log(`ObjectStore.readObject: Retrieved object ${id}, size: ${object.size} bytes`);
      
      const data = await object.arrayBuffer();
      const metadata = object.customMetadata || {};

      return {
        id: metadata.id || id,
        data: new Uint8Array(data),
        mimeType: object.httpMetadata?.contentType || 'application/octet-stream',
        size: object.size,
        createdAt: new Date(metadata.createdAt || object.uploaded),
      };
    } catch (error) {
      console.error(`ObjectStore.readObject: Error reading object ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete raw object data from storage
   */
  private async deleteObject(id: string): Promise<void> {
    try {
      const key = `objects/${id}`;
      console.log(`ObjectStore.deleteObject: Deleting object with key ${key}`);
      
      await this.bucket.delete(key);
      console.log(`ObjectStore.deleteObject: Deleted object with key ${key}`);
    } catch (error) {
      console.error(`ObjectStore.deleteObject: Error deleting object ${id}:`, error);
      throw error;
    }
  }
} 