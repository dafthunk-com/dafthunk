import type { ObjectReference } from "@dafthunk/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ObjectStore } from "./object-store";

describe("ObjectStore", () => {
  let mockBucket: any;

  beforeEach(() => {
    mockBucket = {
      put: vi.fn().mockResolvedValue({ etag: "mock-etag" }),
      get: vi.fn(),
      delete: vi.fn().mockResolvedValue(undefined),
      list: vi.fn(),
    };
  });

  describe("Binary Object Storage", () => {
    describe("writeObject", () => {
      it("should write object and return reference with generated ID", async () => {
        const store = new ObjectStore(mockBucket);
        const data = new Uint8Array([1, 2, 3]);

        const result = await store.writeObject(
          data,
          "image/png",
          "org-123",
          "exec-456"
        );

        expect(result).toHaveProperty("id");
        expect(result.mimeType).toBe("image/png");
        expect(mockBucket.put).toHaveBeenCalledWith(
          expect.stringContaining("objects/"),
          data,
          expect.objectContaining({
            httpMetadata: expect.objectContaining({
              contentType: "image/png",
            }),
          })
        );
      });
    });

    describe("writeObjectWithId", () => {
      it("should write object with specific ID", async () => {
        const store = new ObjectStore(mockBucket);
        const data = new Uint8Array([1, 2, 3]);

        const result = await store.writeObjectWithId(
          "custom-id",
          data,
          "image/jpeg",
          "org-123"
        );

        expect(result.id).toBe("custom-id");
        expect(result.mimeType).toBe("image/jpeg");
        expect(mockBucket.put).toHaveBeenCalledWith(
          "objects/custom-id/object.data",
          data,
          expect.objectContaining({
            customMetadata: expect.objectContaining({
              id: "custom-id",
              organizationId: "org-123",
            }),
          })
        );
      });

      it("should include executionId when provided", async () => {
        const store = new ObjectStore(mockBucket);
        const data = new Uint8Array([1, 2, 3]);

        await store.writeObjectWithId(
          "custom-id",
          data,
          "image/png",
          "org-123",
          "exec-456"
        );

        expect(mockBucket.put).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(Uint8Array),
          expect.objectContaining({
            customMetadata: expect.objectContaining({
              executionId: "exec-456",
            }),
          })
        );
      });
    });

    describe("readObject", () => {
      it("should read object and return data with metadata", async () => {
        const mockData = new Uint8Array([1, 2, 3]);
        mockBucket.get.mockResolvedValue({
          arrayBuffer: vi.fn().mockResolvedValue(mockData.buffer),
          size: 3,
          customMetadata: { organizationId: "org-123" },
        });

        const store = new ObjectStore(mockBucket);
        const reference: ObjectReference = {
          id: "obj-123",
          mimeType: "image/png",
        };

        const result = await store.readObject(reference);

        expect(result).not.toBeNull();
        expect(result?.data).toEqual(mockData);
        expect(result?.metadata).toEqual({ organizationId: "org-123" });
        expect(mockBucket.get).toHaveBeenCalledWith(
          "objects/obj-123/object.data"
        );
      });

      it("should return null when object not found", async () => {
        mockBucket.get.mockResolvedValue(null);

        const store = new ObjectStore(mockBucket);
        const reference: ObjectReference = {
          id: "obj-123",
          mimeType: "image/png",
        };

        const result = await store.readObject(reference);

        expect(result).toBeNull();
      });
    });

    describe("deleteObject", () => {
      it("should delete object", async () => {
        const store = new ObjectStore(mockBucket);
        const reference: ObjectReference = {
          id: "obj-123",
          mimeType: "image/png",
        };

        await store.deleteObject(reference);

        expect(mockBucket.delete).toHaveBeenCalledWith(
          "objects/obj-123/object.data"
        );
      });
    });

    describe("listObjects", () => {
      it("should list objects for organization", async () => {
        mockBucket.list.mockResolvedValue({
          objects: [
            {
              key: "objects/obj-1/object.data",
              size: 100,
              httpMetadata: { contentType: "image/png" },
              customMetadata: {
                organizationId: "org-123",
                createdAt: "2024-01-01T00:00:00Z",
                executionId: "exec-1",
              },
            },
            {
              key: "objects/obj-2/object.data",
              size: 200,
              httpMetadata: { contentType: "image/jpeg" },
              customMetadata: {
                organizationId: "org-123",
                createdAt: "2024-01-02T00:00:00Z",
              },
            },
            {
              key: "objects/obj-3/object.data",
              size: 300,
              httpMetadata: { contentType: "image/gif" },
              customMetadata: {
                organizationId: "org-456", // Different org
                createdAt: "2024-01-03T00:00:00Z",
              },
            },
          ],
        });

        const store = new ObjectStore(mockBucket);
        const result = await store.listObjects("org-123");

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
          id: "obj-1",
          mimeType: "image/png",
          size: 100,
          createdAt: new Date("2024-01-01T00:00:00Z"),
          organizationId: "org-123",
          executionId: "exec-1",
        });
        expect(result[1].id).toBe("obj-2");
      });
    });
  });

  describe("writeAndPresign", () => {
      it("should write object and return presigned URL", async () => {
        const store = new ObjectStore(mockBucket, {
          accountId: "test-account",
          bucketName: "test-bucket",
          accessKeyId: "test-key",
          secretAccessKey: "test-secret",
        });
        const data = new Uint8Array([1, 2, 3]);

        // writeAndPresign calls writeObject then getPresignedUrl
        // getPresignedUrl uses AwsClient which needs real crypto, so we spy on it
        const writeObjectSpy = vi
          .spyOn(store, "writeObject")
          .mockResolvedValue({ id: "mock-id", mimeType: "image/png" });
        const getPresignedUrlSpy = vi
          .spyOn(store, "getPresignedUrl")
          .mockResolvedValue("https://presigned.example.com/mock");

        const url = await store.writeAndPresign(
          data,
          "image/png",
          "org-123",
          7200
        );

        expect(writeObjectSpy).toHaveBeenCalledWith(data, "image/png", "org-123");
        expect(getPresignedUrlSpy).toHaveBeenCalledWith(
          { id: "mock-id", mimeType: "image/png" },
          7200
        );
        expect(url).toBe("https://presigned.example.com/mock");
      });

      it("should throw when presigned URL config is missing", async () => {
        const store = new ObjectStore(mockBucket);

        vi.spyOn(store, "writeObject").mockResolvedValue({
          id: "mock-id",
          mimeType: "image/png",
        });

        await expect(
          store.writeAndPresign(
            new Uint8Array([1, 2, 3]),
            "image/png",
            "org-123"
          )
        ).rejects.toThrow("Presigned URL configuration not set");
      });
    });

  describe("Error Handling", () => {
    it("should throw error when bucket not initialized", async () => {
      const store = new ObjectStore(null as any);

      await expect(
        store.writeObject(new Uint8Array([1, 2, 3]), "image/png", "org-123")
      ).rejects.toThrow("R2 bucket is not initialized");
    });

    it("should handle bucket put failure", async () => {
      mockBucket.put.mockRejectedValue(new Error("Storage error"));

      const store = new ObjectStore(mockBucket);

      await expect(
        store.writeObject(new Uint8Array([1, 2, 3]), "image/png", "org-123")
      ).rejects.toThrow("Storage error");
    });

    it("should handle bucket get failure", async () => {
      mockBucket.get.mockRejectedValue(new Error("Read error"));

      const store = new ObjectStore(mockBucket);
      const reference: ObjectReference = {
        id: "obj-123",
        mimeType: "image/png",
      };

      await expect(store.readObject(reference)).rejects.toThrow("Read error");
    });
  });
});
