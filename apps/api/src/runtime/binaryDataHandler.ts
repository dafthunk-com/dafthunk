import { ObjectReference, ObjectStore } from "./store";

/**
 * Manages binary data conversion and storage in workflows
 */
export class BinaryDataHandler {
  private store: ObjectStore | undefined;

  constructor(store?: ObjectStore) {
    this.store = store;
  }

  /**
   * Converts a blob to a storable reference
   * If no object store is available, returns the blob as is
   */
  async storeBlob(blob: Blob): Promise<ObjectReference | Blob> {
    if (!this.store) {
      // No storage available, return blob as is
      return blob;
    }

    try {
      // Convert to array buffer and store
      const buffer = await blob.arrayBuffer();
      const data = new Uint8Array(buffer);
      const reference = await this.store.writeObject(data, blob.type);

      return reference;
    } catch (error) {
      console.error("BinaryDataHandler: Failed to store blob", error);
      // Fall back to returning the blob directly
      return blob;
    }
  }

  /**
   * Retrieves a blob from a reference
   * If the input is already a blob, returns it as is
   */
  async retrieveBlob(input: ObjectReference | Blob): Promise<Blob> {
    if (input instanceof Blob) {
      return input;
    }

    if (!this.store) {
      throw new Error("Cannot retrieve blob: No object store available");
    }

    try {
      const data = await this.store.readObject(input);
      return new Blob([data], { type: input.mimeType });
    } catch (error) {
      console.error("BinaryDataHandler: Failed to retrieve blob", error);
      throw new Error(
        `Failed to retrieve blob: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Checks if an object is a reference
   */
  isReference(obj: any): obj is ObjectReference {
    return (
      obj &&
      typeof obj === "object" &&
      "id" in obj &&
      "mimeType" in obj &&
      typeof obj.id === "string" &&
      typeof obj.mimeType === "string"
    );
  }

  /**
   * Deletes a blob from storage if it's a reference
   */
  async deleteBlob(input: ObjectReference | Blob): Promise<void> {
    if (input instanceof Blob || !this.store) {
      // Nothing to delete if it's a blob or no store is available
      return;
    }

    try {
      await this.store.deleteObject(input);
    } catch (error) {
      console.error("BinaryDataHandler: Failed to delete blob", error);
      // Swallow error, as this might be cleanup code
    }
  }

  /**
   * Loads binary data from a reference or value
   */
  async loadBinaryData(value: any): Promise<any> {
    if (!this.store) return value;

    // Handle object references
    if (this.isReference(value)) {
      try {
        const data = await this.store.readObject(value);
        return new Blob([data], { type: value.mimeType });
      } catch (error) {
        console.error("Failed to load binary data from reference", error);
        throw new Error(
          `Failed to load binary data: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return value;
  }

  /**
   * Stores binary data and returns a reference
   */
  async storeBinaryData(value: any): Promise<ObjectReference | any> {
    if (!this.store) {
      return value;
    }

    if (value instanceof Blob) {
      return this.storeBlob(value);
    }

    if (value instanceof Uint8Array || ArrayBuffer.isView(value)) {
      const blob = new Blob([value]);
      return this.storeBlob(blob);
    }

    // If it's not a binary type, return as is
    return value;
  }
}
