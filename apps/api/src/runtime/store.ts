import { v4 as uuidv4 } from "uuid";
import type { R2Bucket } from "@cloudflare/workers-types";
import { ObjectReference } from "@dafthunk/types";

export interface StoreObject {
  id: string;
  data: Uint8Array;
  mimeType: string;
  size: number;
  createdAt: Date;
}

export class ObjectStore {
  private bucket: R2Bucket;

  constructor(bucket: R2Bucket) {
    console.log(`ObjectStore initialized with bucket:`, {
      bucketExists: !!bucket,
    });
    this.bucket = bucket;
  }

  /**
   * Write a binary object to storage and return a reference
   */
  async writeObject(data: Uint8Array, mimeType: string): Promise<ObjectReference> {
    try {
      console.log(
        `ObjectStore.write: Starting to write object of type ${mimeType}, size: ${data.length} bytes`
      );

      if (!this.bucket) {
        console.error("ObjectStore.write: R2 bucket is not initialized");
        throw new Error("R2 bucket is not initialized");
      }

      const id = uuidv4();
      const key = `objects/${id}/object.data`;

      console.log(
        `ObjectStore.write: Attempting to store object with key ${key}`
      );

      const writeResult = await this.bucket.put(key, data, {
        httpMetadata: {
          contentType: mimeType,
          cacheControl: "public, max-age=31536000",
        },
        customMetadata: {
          id,
          createdAt: new Date().toISOString(),
        },
      });

      console.log(
        `ObjectStore.write: Successfully stored object ${id}, etag: ${writeResult?.etag || "unknown"}`
      );

      return {
        id,
        mimeType: mimeType,
      };
    } catch (error) {
      console.error("ObjectStore.write: Failed to write object to R2:", error);
      throw error;
    }
  }

  /**
   * Read an object from storage using its reference
   */
  async readObject(reference: ObjectReference): Promise<Uint8Array> {
    try {
      console.log(
        `ObjectStore.read: Attempting to read object with id ${reference.id}`
      );

      if (!this.bucket) {
        console.error("ObjectStore.read: R2 bucket is not initialized");
        throw new Error("R2 bucket is not initialized");
      }

      const key = `objects/${reference.id}/object.data`;
      console.log(`ObjectStore.readObject: Getting object with key ${key}`);

      const object = await this.bucket.get(key);

      if (!object) {
        console.log(`ObjectStore.readObject: Object not found with key ${key}`);
        console.error(`ObjectStore.read: Object not found: ${reference.id}`);
        throw new Error(`Object not found: ${reference.id}`);
      }

      console.log(
        `ObjectStore.readObject: Retrieved object ${reference.id}, size: ${object.size} bytes`
      );

      const data = await object.arrayBuffer();
      console.log(
        `ObjectStore.read: Successfully read object ${reference.id}, size: ${data.byteLength} bytes`
      );
      return new Uint8Array(data);
    } catch (error) {
      console.error(
        `ObjectStore.read: Failed to read object ${reference.id}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Delete an object from storage using its reference
   */
  async deleteObject(reference: ObjectReference): Promise<void> {
    try {
      console.log(
        `ObjectStore.delete: Attempting to delete object with id ${reference.id}`
      );

      if (!this.bucket) {
        console.error("ObjectStore.delete: R2 bucket is not initialized");
        throw new Error("R2 bucket is not initialized");
      }

      const key = `objects/${reference.id}/object.data`;
      console.log(`ObjectStore.deleteObject: Deleting object with key ${key}`);

      await this.bucket.delete(key);
      console.log(`ObjectStore.deleteObject: Deleted object with key ${key}`);
      console.log(
        `ObjectStore.delete: Successfully deleted object ${reference.id}`
      );
    } catch (error) {
      console.error(
        `ObjectStore.delete: Failed to delete object ${reference.id}:`,
        error
      );
      throw error;
    }
  }
}
