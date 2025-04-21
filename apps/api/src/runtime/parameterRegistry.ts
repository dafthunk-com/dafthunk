import { ParameterValue as ApiParameterValue } from "../lib/api/types";
import {
  ParameterValue as NodeParameterValue,
  ImageParameter as NodeImageParameter,
  DocumentParameter as NodeDocumentParameter,
  AudioParameter as NodeAudioParameter,
} from "../lib/nodes/types";
import { BinaryDataHandler } from "./binaryDataHandler";
import { ObjectReference } from "./store";

type TypeConverter = {
  nodeToApi: (
    value: NodeParameterValue,
    context?: any
  ) => Promise<ApiParameterValue> | ApiParameterValue;
  apiToNode: (
    value: ApiParameterValue,
    context?: any
  ) => Promise<NodeParameterValue> | NodeParameterValue;
};

/**
 * Registry for parameter types and conversions between node parameters and api parameters
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
      nodeToApi: (value) => value as string,
      apiToNode: (value) => value as string,
    });

    // Number converter
    this.registerConverter("number", {
      nodeToApi: (value) => value as number,
      apiToNode: (value) => value as number,
    });

    // Boolean converter
    this.registerConverter("boolean", {
      nodeToApi: (value) => value as boolean,
      apiToNode: (value) => value as boolean,
    });

    // Array converter
    this.registerConverter("array", {
      nodeToApi: (value) => value as Array<any>,
      apiToNode: (value) => value as Array<any>,
    });

    // JSON converter
    this.registerConverter("json", {
      nodeToApi: (value) => value as Record<string, any>,
      apiToNode: (value) => value as Record<string, any>,
    });

    // Image converter
    this.registerConverter("image", {
      // Convert node image (with binary data) to runtime image (with reference)
      nodeToApi: async (value) => {
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
          return value as ObjectReference;
        }

        // Convert from node format (data + mimeType) to runtime format (id + mimeType)
        if (
          typeof value === "object" &&
          value !== null &&
          "data" in value &&
          "mimeType" in value &&
          value.data instanceof Uint8Array
        ) {
          const nodeImage = value as NodeImageParameter;
          const blob = new Blob([nodeImage.data], { type: nodeImage.mimeType });
          const reference = await this.binaryHandler.storeBlob(blob);

          // Return reference or blob depending on what was returned
          if (this.binaryHandler.isReference(reference)) {
            return {
              id: reference.id,
              mimeType: reference.mimeType,
            } as ObjectReference;
          } else {
            throw new Error("Failed to store image: Storage not available");
          }
        }

        throw new Error(`Invalid image format: ${JSON.stringify(value)}`);
      },

      // Convert runtime image (with reference) to node image (with binary data)
      apiToNode: async (value) => {
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
          return value as NodeImageParameter;
        }

        // Convert from runtime format (id + mimeType) to node format (data + mimeType)
        if (
          typeof value === "object" &&
          value !== null &&
          "id" in value &&
          "mimeType" in value &&
          typeof value.id === "string"
        ) {
          const runtimeImage = value as ObjectReference;
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
            } as NodeImageParameter;
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

    // Document converter
    this.registerConverter("document", {
      // Convert node document (with binary data) to runtime document (with reference)
      nodeToApi: async (value) => {
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
          // It's already a runtime document value
          return value as ObjectReference;
        }

        // Convert from node format (data + mimeType) to runtime format (id + mimeType)
        if (
          typeof value === "object" &&
          value !== null &&
          "data" in value &&
          "mimeType" in value &&
          value.data instanceof Uint8Array
        ) {
          const nodeDocument = value as NodeDocumentParameter;
          const blob = new Blob([nodeDocument.data], {
            type: nodeDocument.mimeType,
          });
          const reference = await this.binaryHandler.storeBlob(blob);

          // Return reference or blob depending on what was returned
          if (this.binaryHandler.isReference(reference)) {
            return {
              id: reference.id,
              mimeType: reference.mimeType,
            } as ObjectReference;
          } else {
            throw new Error("Failed to store document: Storage not available");
          }
        }

        throw new Error(`Invalid document format: ${JSON.stringify(value)}`);
      },

      // Convert runtime document (with reference) to node document (with binary data)
      apiToNode: async (value) => {
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
          // It's already a node document value
          return value as NodeDocumentParameter;
        }

        // Convert from runtime format (id + mimeType) to node format (data + mimeType)
        if (
          typeof value === "object" &&
          value !== null &&
          "id" in value &&
          "mimeType" in value &&
          typeof value.id === "string"
        ) {
          const runtimeDocument = value as ObjectReference;
          const reference: ObjectReference = {
            id: runtimeDocument.id,
            mimeType: runtimeDocument.mimeType,
          };

          try {
            const blob = await this.binaryHandler.retrieveBlob(reference);
            const buffer = await blob.arrayBuffer();
            return {
              data: new Uint8Array(buffer),
              mimeType: blob.type,
            } as NodeDocumentParameter;
          } catch (error) {
            throw new Error(
              `Failed to load document: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }

        throw new Error(
          `Invalid document reference format: ${JSON.stringify(value)}`
        );
      },
    });

    // Audio converter
    this.registerConverter("audio", {
      // Convert node audio (with binary data) to runtime audio (with reference)
      nodeToApi: async (value) => {
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
          // It's already a runtime audio value
          return value as ObjectReference;
        }

        // Convert from node format (data + mimeType) to runtime format (id + mimeType)
        if (
          typeof value === "object" &&
          value !== null &&
          "data" in value &&
          "mimeType" in value &&
          value.data instanceof Uint8Array
        ) {
          const nodeAudio = value as NodeAudioParameter;
          const blob = new Blob([nodeAudio.data], { type: nodeAudio.mimeType });
          const reference = await this.binaryHandler.storeBlob(blob);

          // Return reference or blob depending on what was returned
          if (this.binaryHandler.isReference(reference)) {
            return {
              id: reference.id,
              mimeType: reference.mimeType,
            } as ObjectReference;
          } else {
            throw new Error("Failed to store audio: Storage not available");
          }
        }

        throw new Error(`Invalid audio format: ${JSON.stringify(value)}`);
      },

      // Convert runtime audio (with reference) to node audio (with binary data)
      apiToNode: async (value) => {
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
          // It's already a node audio value
          return value as NodeAudioParameter;
        }

        // Convert from runtime format (id + mimeType) to node format (data + mimeType)
        if (
          typeof value === "object" &&
          value !== null &&
          "id" in value &&
          "mimeType" in value &&
          typeof value.id === "string"
        ) {
          const runtimeAudio = value as ObjectReference;
          const reference: ObjectReference = {
            id: runtimeAudio.id,
            mimeType: runtimeAudio.mimeType,
          };

          try {
            const blob = await this.binaryHandler.retrieveBlob(reference);
            const buffer = await blob.arrayBuffer();
            return {
              data: new Uint8Array(buffer),
              mimeType: blob.type,
            } as NodeAudioParameter;
          } catch (error) {
            throw new Error(
              `Failed to load audio: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }

        throw new Error(
          `Invalid audio reference format: ${JSON.stringify(value)}`
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
  ): Promise<ApiParameterValue> {
    const converter = this.converters.get(type);
    if (!converter) {
      throw new Error(`No converter registered for type: ${type}`);
    }
    return await converter.nodeToApi(value);
  }

  /**
   * Convert a runtime parameter value to a node parameter value
   */
  public async convertRuntimeToNode(
    type: string,
    value: ApiParameterValue
  ): Promise<NodeParameterValue> {
    const converter = this.converters.get(type);
    if (!converter) {
      throw new Error(`No converter registered for type: ${type}`);
    }
    return await converter.apiToNode(value);
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
