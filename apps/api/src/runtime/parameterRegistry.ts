import { ParameterValue as RuntimeParameterValue } from "./types";
import { ParameterValue as NodeParameterValue } from "../nodes/types";
import { BinaryDataHandler } from "./binaryDataHandler";
import { ObjectReference } from "./store";

// Define more specific image types
interface NodeImageValue {
  data: Uint8Array;
  mimeType: string;
}

interface RuntimeImageValue {
  id: string;
  mimeType: string;
}

type TypeConverter = {
  nodeToRuntime: (
    value: NodeParameterValue,
    context?: any
  ) => Promise<RuntimeParameterValue> | RuntimeParameterValue;
  runtimeToNode: (
    value: RuntimeParameterValue,
    context?: any
  ) => Promise<NodeParameterValue> | NodeParameterValue;
};

/**
 * Registry for parameter types and conversions between node parameters and runtime parameters
 */
export class ParameterRegistry {
  private static instance: ParameterRegistry;
  private converters: Map<string, TypeConverter>;
  private readonly binaryHandler: BinaryDataHandler;

  private constructor(binaryHandler: BinaryDataHandler) {
    this.converters = new Map();
    this.registerDefaultConverters();
    this.binaryHandler = binaryHandler;
  }

  public static getInstance(
    binaryHandler: BinaryDataHandler
  ): ParameterRegistry {
    if (!ParameterRegistry.instance) {
      ParameterRegistry.instance = new ParameterRegistry(binaryHandler);
    }
    return ParameterRegistry.instance;
  }

  /**
   * Register default type converters for basic types
   */
  private registerDefaultConverters() {
    // String converter
    this.registerConverter("string", {
      nodeToRuntime: (value) => value as string,
      runtimeToNode: (value) => value as string,
    });

    // Number converter
    this.registerConverter("number", {
      nodeToRuntime: (value) => value as number,
      runtimeToNode: (value) => value as number,
    });

    // Boolean converter
    this.registerConverter("boolean", {
      nodeToRuntime: (value) => value as boolean,
      runtimeToNode: (value) => value as boolean,
    });

    // Image converter
    this.registerConverter("image", {
      // Convert node image (with binary data) to runtime image (with reference)
      nodeToRuntime: async (value) => {
        // If no value, return undefined
        if (!value) return undefined;

        // Already in runtime format (id + mimeType)
        if (
          typeof value === "object" &&
          value !== null &&
          "id" in value &&
          "mimeType" in value &&
          typeof value.id === "string" &&
          typeof value.mimeType === "string"
        ) {
          // It's already a runtime image value
          return value as RuntimeImageValue;
        }

        // Convert from node format (data + mimeType) to runtime format (id + mimeType)
        if (
          typeof value === "object" &&
          value !== null &&
          "data" in value &&
          "mimeType" in value &&
          value.data instanceof Uint8Array
        ) {
          const nodeImage = value as NodeImageValue;
          const blob = new Blob([nodeImage.data], { type: nodeImage.mimeType });
          const reference = await this.binaryHandler.storeBlob(blob);

          // Return reference or blob depending on what was returned
          if (this.binaryHandler.isReference(reference)) {
            return {
              id: reference.id,
              mimeType: reference.mimeType,
            } as RuntimeImageValue;
          } else {
            throw new Error("Failed to store image: Storage not available");
          }
        }

        throw new Error(`Invalid image format: ${JSON.stringify(value)}`);
      },

      // Convert runtime image (with reference) to node image (with binary data)
      runtimeToNode: async (value) => {
        // If no value, return undefined
        if (!value) return undefined;

        // Already in node format (data + mimeType)
        if (
          typeof value === "object" &&
          value !== null &&
          "data" in value &&
          "mimeType" in value &&
          value.data instanceof Uint8Array
        ) {
          // It's already a node image value
          return value as NodeImageValue;
        }

        // Convert from runtime format (id + mimeType) to node format (data + mimeType)
        if (
          typeof value === "object" &&
          value !== null &&
          "id" in value &&
          "mimeType" in value &&
          typeof value.id === "string"
        ) {
          const runtimeImage = value as RuntimeImageValue;
          const reference: ObjectReference = {
            id: runtimeImage.id,
            mimeType: runtimeImage.mimeType,
          };

          try {
            const blob = await this.binaryHandler.retrieveBlob(reference);
            const buffer = await blob.arrayBuffer();
            return {
              data: new Uint8Array(buffer),
              mimeType: blob.type,
            } as NodeImageValue;
          } catch (error) {
            throw new Error(
              `Failed to load image: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }

        throw new Error(
          `Invalid image reference format: ${JSON.stringify(value)}`
        );
      },
    });
  }

  /**
   * Register a new type converter
   */
  public registerConverter(type: string, converter: TypeConverter): void {
    this.converters.set(type, converter);
  }

  /**
   * Convert a node parameter value to a runtime parameter value
   */
  public async convertNodeToRuntime(
    type: string,
    value: NodeParameterValue
  ): Promise<RuntimeParameterValue> {
    const converter = this.converters.get(type);
    if (!converter) {
      throw new Error(`No converter registered for type: ${type}`);
    }
    return await converter.nodeToRuntime(value);
  }

  /**
   * Convert a runtime parameter value to a node parameter value
   */
  public async convertRuntimeToNode(
    type: string,
    value: RuntimeParameterValue
  ): Promise<NodeParameterValue> {
    const converter = this.converters.get(type);
    if (!converter) {
      throw new Error(`No converter registered for type: ${type}`);
    }
    return await converter.runtimeToNode(value);
  }

  /**
   * Check if a type is registered
   */
  public hasType(type: string): boolean {
    return this.converters.has(type);
  }

  /**
   * Get all registered types
   */
  public getRegisteredTypes(): string[] {
    return Array.from(this.converters.keys());
  }
}
