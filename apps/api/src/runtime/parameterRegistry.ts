import {
  ParameterValue as ApiParameterValue,
  JsonArray,
} from "@dafthunk/types";
import {
  ParameterValue as NodeParameterValue,
  ImageParameter as NodeImageParameter,
  DocumentParameter as NodeDocumentParameter,
  AudioParameter as NodeAudioParameter,
} from "../nodes/types";
import { ObjectStore } from "./store";
import { ObjectReference } from "@dafthunk/types";

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
  private readonly objectStore: ObjectStore;

  private constructor(objectStore: ObjectStore) {
    this.converters = new Map();
    this.registerDefaultConverters();
    this.objectStore = objectStore;
  }

  public static getInstance(objectStore: ObjectStore): ParameterRegistry {
    if (!ParameterRegistry.instance) {
      ParameterRegistry.instance = new ParameterRegistry(objectStore);
    }
    return ParameterRegistry.instance;
  }

  /**
   * Register default type converters for basic types
   */
  private registerDefaultConverters() {
    // String converter
    this.registerConverter("string", {
      nodeToApi: (value: NodeParameterValue) =>
        typeof value === "string" ? value : undefined,
      apiToNode: (value: ApiParameterValue) =>
        typeof value === "string" ? value : undefined,
    });

    // Number converter
    this.registerConverter("number", {
      nodeToApi: (value: NodeParameterValue) =>
        typeof value === "number" ? value : undefined,
      apiToNode: (value: ApiParameterValue) =>
        typeof value === "number" ? value : undefined,
    });

    // Boolean converter
    this.registerConverter("boolean", {
      nodeToApi: (value: NodeParameterValue) =>
        typeof value === "boolean" ? value : undefined,
      apiToNode: (value: ApiParameterValue) =>
        typeof value === "boolean" ? value : undefined,
    });

    // Type guards for binary parameter types
    function isImageParameter(value: unknown): value is NodeImageParameter {
      return (
        !!value &&
        typeof value === "object" &&
        "data" in value &&
        "mimeType" in value &&
        value["data"] instanceof Uint8Array &&
        typeof value["mimeType"] === "string"
      );
    }
    function isDocumentParameter(
      value: unknown
    ): value is NodeDocumentParameter {
      return (
        !!value &&
        typeof value === "object" &&
        "data" in value &&
        "mimeType" in value &&
        value["data"] instanceof Uint8Array &&
        typeof value["mimeType"] === "string"
      );
    }
    function isAudioParameter(value: unknown): value is NodeAudioParameter {
      return (
        !!value &&
        typeof value === "object" &&
        "data" in value &&
        "mimeType" in value &&
        value["data"] instanceof Uint8Array &&
        typeof value["mimeType"] === "string"
      );
    }
    function isPlainJsonObject(value: unknown): value is Record<string, any> {
      if (!value || typeof value !== "object" || Array.isArray(value))
        return false;
      // Exclude binary parameter types
      if (
        isImageParameter(value) ||
        isDocumentParameter(value) ||
        isAudioParameter(value)
      )
        return false;
      // Exclude Uint8Array
      if (value instanceof Uint8Array) return false;
      return true;
    }
    function isJsonArray(value: unknown): value is JsonArray {
      if (!Array.isArray(value)) return false;
      // Exclude binary parameter types
      if (
        isImageParameter(value) ||
        isDocumentParameter(value) ||
        isAudioParameter(value)
      )
        return false;
      // Recursively check all elements
      return value.every(
        (el) =>
          el === null ||
          el === undefined ||
          typeof el === "string" ||
          typeof el === "number" ||
          typeof el === "boolean" ||
          isPlainJsonObject(el) ||
          isJsonArray(el)
      );
    }

    // Image converter
    this.registerConverter("image", {
      nodeToApi: async (
        value: NodeParameterValue
      ): Promise<ObjectReference | undefined> => {
        if (!isImageParameter(value)) return undefined;
        const blob = new Blob([value.data], { type: value.mimeType });
        const buffer = await blob.arrayBuffer();
        const data = new Uint8Array(buffer);
        return await this.objectStore.writeObject(data, blob.type);
      },
      apiToNode: async (value: ApiParameterValue) => {
        if (
          !value ||
          typeof value !== "object" ||
          !("id" in value) ||
          !("mimeType" in value)
        )
          return undefined;
        const data = await this.objectStore.readObject(
          value as ObjectReference
        );
        return {
          data,
          mimeType: (value as ObjectReference).mimeType,
        } as NodeImageParameter;
      },
    });

    // Document converter
    this.registerConverter("document", {
      nodeToApi: async (
        value: NodeParameterValue
      ): Promise<ObjectReference | undefined> => {
        if (!isDocumentParameter(value)) return undefined;
        const blob = new Blob([value.data], { type: value.mimeType });
        const buffer = await blob.arrayBuffer();
        const data = new Uint8Array(buffer);
        return await this.objectStore.writeObject(data, blob.type);
      },
      apiToNode: async (value: ApiParameterValue) => {
        if (
          !value ||
          typeof value !== "object" ||
          !("id" in value) ||
          !("mimeType" in value)
        )
          return undefined;
        const data = await this.objectStore.readObject(
          value as ObjectReference
        );
        return {
          data,
          mimeType: (value as ObjectReference).mimeType,
        } as NodeDocumentParameter;
      },
    });

    // Audio converter
    this.registerConverter("audio", {
      nodeToApi: async (
        value: NodeParameterValue
      ): Promise<ObjectReference | undefined> => {
        if (!isAudioParameter(value)) return undefined;
        const blob = new Blob([value.data], { type: value.mimeType });
        const buffer = await blob.arrayBuffer();
        const data = new Uint8Array(buffer);
        return await this.objectStore.writeObject(data, blob.type);
      },
      apiToNode: async (value: ApiParameterValue) => {
        if (
          !value ||
          typeof value !== "object" ||
          !("id" in value) ||
          !("mimeType" in value)
        )
          return undefined;
        const data = await this.objectStore.readObject(
          value as ObjectReference
        );
        return {
          data,
          mimeType: (value as ObjectReference).mimeType,
        } as NodeAudioParameter;
      },
    });

    // Array converter
    this.registerConverter("array", {
      nodeToApi: (value: NodeParameterValue) =>
        (isJsonArray(value) ? value : undefined) as ApiParameterValue,
      apiToNode: (value: ApiParameterValue) =>
        (isJsonArray(value) ? value : undefined) as NodeParameterValue,
    });

    // JSON converter
    this.registerConverter("json", {
      nodeToApi: (value: NodeParameterValue) =>
        (isPlainJsonObject(value) ? value : undefined) as ApiParameterValue,
      apiToNode: (value: ApiParameterValue) =>
        (isPlainJsonObject(value) ? value : undefined) as NodeParameterValue,
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
