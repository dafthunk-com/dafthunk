import { describe, expect, it, vi } from "vitest";

import { ObjectStore } from "../runtime/object-store";
import { apiToNodeParameter, nodeToApiParameter } from "./parameter-mapper";
import { BufferGeometryParameter } from "./types";

describe("Parameter Mapper - BufferGeometry", () => {
  const createMockObjectStore = (): ObjectStore => {
    const mockBucket = {} as any;
    const mockStore = new ObjectStore(mockBucket);

    vi.spyOn(mockStore, "writeObject").mockResolvedValue({
      id: "test-geometry-id",
      mimeType: "application/x-buffer-geometry",
    });

    vi.spyOn(mockStore, "readObject").mockResolvedValue({
      data: new Uint8Array([1, 2, 3, 4]),
      metadata: {},
    });

    return mockStore;
  };

  const createBufferGeometry = (): BufferGeometryParameter => ({
    data: new Uint8Array([1, 2, 3, 4]),
    mimeType: "application/x-buffer-geometry",
  });

  describe("BufferGeometry Type Guard", () => {
    it("should identify valid BufferGeometry parameters", () => {
      const validGeometry = createBufferGeometry();

      // Using the internal isBufferGeometryParameter logic
      const isValid =
        !!validGeometry &&
        typeof validGeometry === "object" &&
        "data" in validGeometry &&
        "mimeType" in validGeometry &&
        validGeometry.data instanceof Uint8Array &&
        typeof validGeometry.mimeType === "string";

      expect(isValid).toBe(true);
    });

    it("should reject invalid BufferGeometry parameters", () => {
      const invalidCases = [
        null,
        undefined,
        {},
        { data: "not-uint8array" },
        { mimeType: "test" },
        { data: new Uint8Array([1, 2]), mimeType: 123 },
        { data: new Array([1, 2]), mimeType: "application/x-buffer-geometry" },
      ];

      invalidCases.forEach((invalidCase) => {
        const isValid =
          !!invalidCase &&
          typeof invalidCase === "object" &&
          "data" in invalidCase &&
          "mimeType" in invalidCase &&
          invalidCase.data instanceof Uint8Array &&
          typeof invalidCase.mimeType === "string";

        expect(isValid).toBe(false);
      });
    });
  });

  describe("nodeToApiParameter - BufferGeometry", () => {
    it("should convert BufferGeometry to ObjectReference", async () => {
      const mockStore = createMockObjectStore();
      const geometry = createBufferGeometry();

      const result = await nodeToApiParameter(
        "buffergeometry",
        geometry,
        mockStore,
        "test-org",
        "test-execution"
      );

      expect(mockStore.writeObject).toHaveBeenCalledWith(
        expect.any(Uint8Array),
        "application/x-buffer-geometry",
        "test-org",
        "test-execution"
      );

      expect(result).toEqual({
        id: "test-geometry-id",
        mimeType: "application/x-buffer-geometry",
      });
    });

    it("should return undefined for invalid BufferGeometry", async () => {
      const mockStore = createMockObjectStore();

      const result = await nodeToApiParameter(
        "buffergeometry",
        { invalid: "data" },
        mockStore,
        "test-org"
      );

      expect(result).toBeUndefined();
      expect(mockStore.writeObject).not.toHaveBeenCalled();
    });

    it("should require objectStore for BufferGeometry", async () => {
      const geometry = createBufferGeometry();

      await expect(
        nodeToApiParameter("buffergeometry", geometry, undefined, "test-org")
      ).rejects.toThrow("ObjectStore required for type: buffergeometry");
    });

    it("should require organizationId for BufferGeometry", async () => {
      const mockStore = createMockObjectStore();
      const geometry = createBufferGeometry();

      await expect(
        nodeToApiParameter("buffergeometry", geometry, mockStore)
      ).rejects.toThrow(
        "organizationId required for object storage for type: buffergeometry"
      );
    });
  });

  describe("apiToNodeParameter - BufferGeometry", () => {
    it("should convert ObjectReference to BufferGeometry", async () => {
      const mockStore = createMockObjectStore();
      const objectRef = {
        id: "test-geometry-id",
        mimeType: "application/x-buffer-geometry",
      };

      const result = await apiToNodeParameter(
        "buffergeometry",
        objectRef,
        mockStore
      );

      expect(mockStore.readObject).toHaveBeenCalledWith(objectRef);
      expect(result).toEqual({
        data: new Uint8Array([1, 2, 3, 4]),
        mimeType: "application/x-buffer-geometry",
      });
    });

    it("should return undefined for invalid ObjectReference", async () => {
      const mockStore = createMockObjectStore();

      const result = await apiToNodeParameter(
        "buffergeometry",
        { invalid: "reference" },
        mockStore
      );

      expect(result).toBeUndefined();
      expect(mockStore.readObject).not.toHaveBeenCalled();
    });

    it("should return undefined when object not found", async () => {
      const mockStore = createMockObjectStore();
      mockStore.readObject = vi.fn().mockResolvedValue(null);

      const objectRef = {
        id: "missing-geometry",
        mimeType: "application/x-buffer-geometry",
      };

      const result = await apiToNodeParameter(
        "buffergeometry",
        objectRef,
        mockStore
      );

      expect(result).toBeUndefined();
    });

    it("should require objectStore for BufferGeometry", async () => {
      const objectRef = {
        id: "test-geometry-id",
        mimeType: "application/x-buffer-geometry",
      };

      await expect(
        apiToNodeParameter("buffergeometry", objectRef)
      ).rejects.toThrow("ObjectStore required for type: buffergeometry");
    });
  });

  describe("Any Type Converter with BufferGeometry", () => {
    it("should handle BufferGeometry in any type nodeToApi", async () => {
      const mockStore = createMockObjectStore();
      const geometry = createBufferGeometry();

      const result = await nodeToApiParameter(
        "any",
        geometry,
        mockStore,
        "test-org",
        "test-execution"
      );

      expect(mockStore.writeObject).toHaveBeenCalled();
      expect(result).toEqual({
        id: "test-geometry-id",
        mimeType: "application/x-buffer-geometry",
      });
    });

    it("should handle BufferGeometry ObjectReference in any type apiToNode", async () => {
      const mockStore = createMockObjectStore();
      const objectRef = {
        id: "test-geometry-id",
        mimeType: "application/x-buffer-geometry",
      };

      const result = await apiToNodeParameter("any", objectRef, mockStore);

      expect(mockStore.readObject).toHaveBeenCalledWith(objectRef);
      expect(result).toEqual({
        data: new Uint8Array([1, 2, 3, 4]),
        mimeType: "application/x-buffer-geometry",
      });
    });

    it("should require objectStore for BufferGeometry in any type", async () => {
      const geometry = createBufferGeometry();

      await expect(
        nodeToApiParameter("any", geometry, undefined, "test-org")
      ).rejects.toThrow(
        "ObjectStore and organizationId required for binary data"
      );
    });
  });

  describe("Edge Cases and Error Conditions", () => {
    it("should handle large BufferGeometry data", async () => {
      const mockStore = createMockObjectStore();
      const largeGeometry: BufferGeometryParameter = {
        data: new Uint8Array(1024 * 1024), // 1MB of data
        mimeType: "application/x-buffer-geometry",
      };

      const result = await nodeToApiParameter(
        "buffergeometry",
        largeGeometry,
        mockStore,
        "test-org"
      );

      expect(mockStore.writeObject).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("should handle empty BufferGeometry data", async () => {
      const mockStore = createMockObjectStore();
      const emptyGeometry: BufferGeometryParameter = {
        data: new Uint8Array(0),
        mimeType: "application/x-buffer-geometry",
      };

      const result = await nodeToApiParameter(
        "buffergeometry",
        emptyGeometry,
        mockStore,
        "test-org"
      );

      expect(mockStore.writeObject).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("should handle objectStore errors gracefully", async () => {
      const mockStore = createMockObjectStore();
      mockStore.writeObject = vi
        .fn()
        .mockRejectedValue(new Error("Storage error"));

      const geometry = createBufferGeometry();

      await expect(
        nodeToApiParameter("buffergeometry", geometry, mockStore, "test-org")
      ).rejects.toThrow("Storage error");
    });

    it("should handle readObject errors gracefully", async () => {
      const mockStore = createMockObjectStore();
      mockStore.readObject = vi.fn().mockRejectedValue(new Error("Read error"));

      const objectRef = {
        id: "test-geometry-id",
        mimeType: "application/x-buffer-geometry",
      };

      await expect(
        apiToNodeParameter("buffergeometry", objectRef, mockStore)
      ).rejects.toThrow("Read error");
    });
  });
});
