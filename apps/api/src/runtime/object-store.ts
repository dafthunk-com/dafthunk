import { ObjectReference } from "@dafthunk/types";
import { AwsClient } from "aws4fetch";
import { v7 as uuid } from "uuid";

export interface PresignedUrlConfig {
  accountId: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
}

/**
 * Manages R2 storage for objects, workflows, and executions.
 * Uses helper methods to eliminate duplication in logging and error handling.
 */
export class ObjectStore {
  constructor(
    private bucket: R2Bucket,
    private presignedUrlConfig?: PresignedUrlConfig
  ) {}

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
    const customMetadata: Record<string, string> = {
      id,
      createdAt: new Date().toISOString(),
      organizationId,
    };
    if (executionId) {
      customMetadata.executionId = executionId;
    }
    if (filename) {
      customMetadata.filename = filename;
    }

    await this.writeToR2(`objects/${id}/object.data`, data, {
      httpMetadata: {
        contentType: mimeType,
        cacheControl: "public, max-age=31536000",
      },
      customMetadata,
    });

    const result: ObjectReference = { id, mimeType };
    if (filename) {
      result.filename = filename;
    }
    return result;
  }

  async readObject(reference: ObjectReference): Promise<{
    data: Uint8Array;
    metadata: R2Object["customMetadata"];
  } | null> {
    const object = await this.readFromR2(
      `objects/${reference.id}/object.data`
    );

    if (!object) return null;

    const arrayBuffer = await object.arrayBuffer();
    return {
      data: new Uint8Array(arrayBuffer),
      metadata: object.customMetadata,
    };
  }

  async deleteObject(reference: ObjectReference): Promise<void> {
    await this.deleteFromR2(`objects/${reference.id}/object.data`);
  }

  /**
   * Generate a presigned URL for downloading an object.
   * Requires presignedUrlConfig to be set via the constructor.
   *
   * @param reference - The object reference
   * @param expiresInSeconds - URL expiration time (default: 3600, max: 604800 = 7 days)
   * @returns Presigned URL string
   */
  async getPresignedUrl(
    reference: ObjectReference,
    expiresInSeconds: number = 3600
  ): Promise<string> {
    if (!this.presignedUrlConfig) {
      throw new Error(
        "Presigned URL configuration not set. Pass PresignedUrlConfig to the ObjectStore constructor."
      );
    }

    const { accountId, bucketName, accessKeyId, secretAccessKey } =
      this.presignedUrlConfig;

    const client = new AwsClient({
      accessKeyId,
      secretAccessKey,
    });

    const key = `objects/${reference.id}/object.data`;
    const url = new URL(
      `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${key}`
    );
    url.searchParams.set("X-Amz-Expires", String(expiresInSeconds));

    const signed = await client.sign(new Request(url, { method: "GET" }), {
      aws: { signQuery: true },
    });

    return signed.url;
  }

  /**
   * Write data to R2 and return a presigned download URL in one step.
   * Combines writeObject + getPresignedUrl to eliminate boilerplate in nodes.
   */
  async writeAndPresign(
    data: Uint8Array,
    mimeType: string,
    organizationId: string,
    expiresInSeconds: number = 3600
  ): Promise<string> {
    const reference = await this.writeObject(data, mimeType, organizationId);
    return this.getPresignedUrl(reference, expiresInSeconds);
  }

  async listObjects(organizationId: string): Promise<
    {
      id: string;
      mimeType: string;
      size: number;
      createdAt: Date;
      organizationId: string;
      executionId?: string;
    }[]
  > {
    const objects = await this.listFromR2("objects/");

    return objects.objects
      .filter((obj) => obj.customMetadata?.organizationId === organizationId)
      .map((obj) => {
        const id = obj.key.split("/")[1];
        return {
          id,
          mimeType: obj.httpMetadata?.contentType || "application/octet-stream",
          size: obj.size,
          createdAt: obj.customMetadata?.createdAt
            ? new Date(obj.customMetadata.createdAt)
            : new Date(),
          organizationId,
          executionId: obj.customMetadata?.executionId,
        };
      });
  }

  private async writeToR2(
    key: string,
    data: string | ArrayBuffer | Uint8Array,
    options: R2PutOptions
  ): Promise<void> {
    try {
      if (!this.bucket) {
        throw new Error("R2 bucket is not initialized");
      }

      await this.bucket.put(key, data, options);
    } catch (error) {
      console.error(`ObjectStore: Failed to write ${key}:`, error);
      throw error;
    }
  }

  private async readFromR2(key: string): Promise<R2ObjectBody | null> {
    try {
      if (!this.bucket) {
        throw new Error("R2 bucket is not initialized");
      }

      return await this.bucket.get(key);
    } catch (error) {
      console.error(`ObjectStore: Failed to read ${key}:`, error);
      throw error;
    }
  }

  private async deleteFromR2(key: string): Promise<void> {
    try {
      if (!this.bucket) {
        throw new Error("R2 bucket is not initialized");
      }

      await this.bucket.delete(key);
    } catch (error) {
      console.error(`ObjectStore: Failed to delete ${key}:`, error);
      throw error;
    }
  }

  private async listFromR2(prefix: string): Promise<R2Objects> {
    try {
      if (!this.bucket) {
        throw new Error("R2 bucket is not initialized");
      }

      return await this.bucket.list({ prefix });
    } catch (error) {
      console.error(
        `ObjectStore: Failed to list with prefix ${prefix}:`,
        error
      );
      throw error;
    }
  }
}
