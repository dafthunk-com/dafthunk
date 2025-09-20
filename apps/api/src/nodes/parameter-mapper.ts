import {
  ObjectReference,
  ParameterValue as ApiParameterValue,
} from "@dafthunk/types";

import { ObjectStore } from "../runtime/object-store";
import {
  AudioParameter as NodeAudioParameter,
  BufferGeometryParameter as NodeBufferGeometryParameter,
  DocumentParameter as NodeDocumentParameter,
  GltfParameter as NodeGltfParameter,
  ImageParameter as NodeImageParameter,
  ParameterValue as NodeParameterValue,
} from "./types";

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

function isDocumentParameter(value: unknown): value is NodeDocumentParameter {
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

function isBufferGeometryParameter(
  value: unknown
): value is NodeBufferGeometryParameter {
  return (
    !!value &&
    typeof value === "object" &&
    "data" in value &&
    "mimeType" in value &&
    value["data"] instanceof Uint8Array &&
    typeof value["mimeType"] === "string"
  );
}

function isGltfParameter(value: unknown): value is NodeGltfParameter {
  return (
    !!value &&
    typeof value === "object" &&
    "data" in value &&
    "mimeType" in value &&
    value["data"] instanceof Uint8Array &&
    typeof value["mimeType"] === "string"
  );
}

function isObjectReference(value: unknown): value is ObjectReference {
  return (
    !!value &&
    typeof value === "object" &&
    "id" in value &&
    typeof (value as any).id === "string" &&
    "mimeType" in value &&
    typeof (value as any).mimeType === "string"
  );
}

// Helper functions for common converter patterns
const createJsonParsingNodeToApi = () => (value: NodeParameterValue) =>
  value as ApiParameterValue;
const createJsonParsingApiToNode = () => (value: ApiParameterValue) => {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as NodeParameterValue;
    } catch (_error) {
      return value as NodeParameterValue;
    }
  }
  return value as NodeParameterValue;
};

const typeValidatingNodeToApi =
  (expectedType: string) => (value: NodeParameterValue) =>
    typeof value === expectedType ? value : undefined;
const typeValidatingApiToNode =
  (expectedType: string) => (value: ApiParameterValue) =>
    typeof value === expectedType ? value : undefined;

// Static mapping of converters
const converters = {
  string: {
    nodeToApi: typeValidatingNodeToApi("string"),
    apiToNode: typeValidatingApiToNode("string"),
  },
  date: {
    nodeToApi: (value: NodeParameterValue) => {
      if (typeof value === "string") {
        const d = new Date(value);
        return isNaN(d.getTime()) ? undefined : d.toISOString();
      }
      if (value instanceof Date) return value.toISOString();
      if (typeof value === "number") {
        const d = new Date(value);
        return isNaN(d.getTime()) ? undefined : d.toISOString();
      }
      return undefined;
    },
    apiToNode: (value: ApiParameterValue) => {
      if (typeof value === "string") {
        const d = new Date(value);
        return isNaN(d.getTime()) ? undefined : d.toISOString();
      }
      if (typeof value === "number") {
        const d = new Date(value);
        return isNaN(d.getTime()) ? undefined : d.toISOString();
      }
      return undefined;
    },
  },
  number: {
    nodeToApi: typeValidatingNodeToApi("number"),
    apiToNode: typeValidatingApiToNode("number"),
  },
  boolean: {
    nodeToApi: typeValidatingNodeToApi("boolean"),
    apiToNode: typeValidatingApiToNode("boolean"),
  },
  image: {
    nodeToApi: async (
      value: NodeParameterValue,
      objectStore: ObjectStore,
      organizationId: string,
      executionId?: string
    ) => {
      if (!isImageParameter(value)) return undefined;
      const blob = new Blob([value.data], { type: value.mimeType });
      const buffer = await blob.arrayBuffer();
      const data = new Uint8Array(buffer);
      return await objectStore.writeObject(
        data,
        blob.type,
        organizationId,
        executionId
      );
    },
    apiToNode: async (value: ApiParameterValue, objectStore: ObjectStore) => {
      if (
        !value ||
        typeof value !== "object" ||
        !("id" in value) ||
        !("mimeType" in value)
      )
        return undefined;
      const result = await objectStore.readObject(value as ObjectReference);
      if (!result) return undefined;
      return {
        data: result.data,
        mimeType: (value as ObjectReference).mimeType,
      } as NodeImageParameter;
    },
  },
  document: {
    nodeToApi: async (
      value: NodeParameterValue,
      objectStore: ObjectStore,
      organizationId: string,
      executionId?: string
    ) => {
      if (!isDocumentParameter(value)) return undefined;
      const blob = new Blob([value.data], { type: value.mimeType });
      const buffer = await blob.arrayBuffer();
      const data = new Uint8Array(buffer);
      return await objectStore.writeObject(
        data,
        blob.type,
        organizationId,
        executionId
      );
    },
    apiToNode: async (value: ApiParameterValue, objectStore: ObjectStore) => {
      if (
        !value ||
        typeof value !== "object" ||
        !("id" in value) ||
        !("mimeType" in value)
      )
        return undefined;
      const result = await objectStore.readObject(value as ObjectReference);
      if (!result) return undefined;
      return {
        data: result.data,
        mimeType: (value as ObjectReference).mimeType,
      } as NodeDocumentParameter;
    },
  },
  audio: {
    nodeToApi: async (
      value: NodeParameterValue,
      objectStore: ObjectStore,
      organizationId: string,
      executionId?: string
    ) => {
      if (!isAudioParameter(value)) return undefined;
      const blob = new Blob([value.data], { type: value.mimeType });
      const buffer = await blob.arrayBuffer();
      const data = new Uint8Array(buffer);
      return await objectStore.writeObject(
        data,
        blob.type,
        organizationId,
        executionId
      );
    },
    apiToNode: async (value: ApiParameterValue, objectStore: ObjectStore) => {
      if (
        !value ||
        typeof value !== "object" ||
        !("id" in value) ||
        !("mimeType" in value)
      )
        return undefined;
      const result = await objectStore.readObject(value as ObjectReference);
      if (!result) return undefined;
      return {
        data: result.data,
        mimeType: (value as ObjectReference).mimeType,
      } as NodeAudioParameter;
    },
  },
  buffergeometry: {
    nodeToApi: async (
      value: NodeParameterValue,
      objectStore: ObjectStore,
      organizationId: string,
      executionId?: string
    ) => {
      if (!isBufferGeometryParameter(value)) return undefined;
      const blob = new Blob([value.data], { type: value.mimeType });
      const buffer = await blob.arrayBuffer();
      const data = new Uint8Array(buffer);
      return await objectStore.writeObject(
        data,
        blob.type,
        organizationId,
        executionId
      );
    },
    apiToNode: async (value: ApiParameterValue, objectStore: ObjectStore) => {
      if (
        !value ||
        typeof value !== "object" ||
        !("id" in value) ||
        !("mimeType" in value)
      )
        return undefined;
      const result = await objectStore.readObject(value as ObjectReference);
      if (!result) return undefined;
      return {
        data: result.data,
        mimeType: (value as ObjectReference).mimeType,
      } as NodeBufferGeometryParameter;
    },
  },
  gltf: {
    nodeToApi: async (
      value: NodeParameterValue,
      objectStore: ObjectStore,
      organizationId: string,
      executionId?: string
    ) => {
      if (!isGltfParameter(value)) return undefined;
      const blob = new Blob([value.data], { type: value.mimeType });
      const buffer = await blob.arrayBuffer();
      const data = new Uint8Array(buffer);
      return await objectStore.writeObject(
        data,
        blob.type,
        organizationId,
        executionId
      );
    },
    apiToNode: async (value: ApiParameterValue, objectStore: ObjectStore) => {
      if (
        !value ||
        typeof value !== "object" ||
        !("id" in value) ||
        !("mimeType" in value)
      )
        return undefined;
      const result = await objectStore.readObject(value as ObjectReference);
      if (!result) return undefined;
      return {
        data: result.data,
        mimeType: (value as ObjectReference).mimeType,
      } as NodeGltfParameter;
    },
  },
  json: {
    nodeToApi: createJsonParsingNodeToApi(),
    apiToNode: createJsonParsingApiToNode(),
  },
  point: {
    nodeToApi: createJsonParsingNodeToApi(),
    apiToNode: createJsonParsingApiToNode(),
  },
  multipoint: {
    nodeToApi: createJsonParsingNodeToApi(),
    apiToNode: createJsonParsingApiToNode(),
  },
  linestring: {
    nodeToApi: createJsonParsingNodeToApi(),
    apiToNode: createJsonParsingApiToNode(),
  },
  multilinestring: {
    nodeToApi: createJsonParsingNodeToApi(),
    apiToNode: createJsonParsingApiToNode(),
  },
  polygon: {
    nodeToApi: createJsonParsingNodeToApi(),
    apiToNode: createJsonParsingApiToNode(),
  },
  multipolygon: {
    nodeToApi: createJsonParsingNodeToApi(),
    apiToNode: createJsonParsingApiToNode(),
  },
  geometry: {
    nodeToApi: createJsonParsingNodeToApi(),
    apiToNode: createJsonParsingApiToNode(),
  },
  geometrycollection: {
    nodeToApi: createJsonParsingNodeToApi(),
    apiToNode: createJsonParsingApiToNode(),
  },
  feature: {
    nodeToApi: createJsonParsingNodeToApi(),
    apiToNode: createJsonParsingApiToNode(),
  },
  featurecollection: {
    nodeToApi: createJsonParsingNodeToApi(),
    apiToNode: createJsonParsingApiToNode(),
  },
  geojson: {
    nodeToApi: createJsonParsingNodeToApi(),
    apiToNode: createJsonParsingApiToNode(),
  },
  secret: {
    nodeToApi: typeValidatingNodeToApi("string"),
    apiToNode: typeValidatingApiToNode("string"),
  },
  any: {
    nodeToApi: (
      value: NodeParameterValue,
      objectStore?: ObjectStore,
      organizationId?: string,
      executionId?: string
    ): Promise<ApiParameterValue> | ApiParameterValue => {
      // Handle binary types that need object storage
      if (
        isImageParameter(value) ||
        isDocumentParameter(value) ||
        isAudioParameter(value) ||
        isBufferGeometryParameter(value) ||
        isGltfParameter(value)
      ) {
        if (!objectStore || !organizationId) {
          throw new Error(
            `ObjectStore and organizationId required for binary data`
          );
        }
        if (isImageParameter(value)) {
          return converters.image.nodeToApi(
            value,
            objectStore,
            organizationId,
            executionId
          );
        }
        if (isDocumentParameter(value)) {
          return converters.document.nodeToApi(
            value,
            objectStore,
            organizationId,
            executionId
          );
        }
        if (isAudioParameter(value)) {
          return converters.audio.nodeToApi(
            value,
            objectStore,
            organizationId,
            executionId
          );
        }
        if (isBufferGeometryParameter(value)) {
          return converters.buffergeometry.nodeToApi(
            value,
            objectStore,
            organizationId,
            executionId
          );
        }
        if (isGltfParameter(value)) {
          return converters.gltf.nodeToApi(
            value,
            objectStore,
            organizationId,
            executionId
          );
        }
      }

      // Handle object references
      if (isObjectReference(value)) {
        return value;
      }

      // Handle simple types (no async needed)
      return value as ApiParameterValue;
    },
    apiToNode: (
      value: ApiParameterValue,
      objectStore?: ObjectStore
    ): Promise<NodeParameterValue> | NodeParameterValue => {
      // Handle object references that need to be resolved
      if (isObjectReference(value)) {
        if (!objectStore) {
          throw new Error(`ObjectStore required to resolve object reference`);
        }

        return (async () => {
          const result = await objectStore.readObject(value as ObjectReference);
          if (!result) return undefined;

          const mimeType = (value as ObjectReference).mimeType;
          if (mimeType.startsWith("image/")) {
            return {
              data: result.data,
              mimeType,
            } as NodeImageParameter;
          }
          if (mimeType.startsWith("audio/")) {
            return {
              data: result.data,
              mimeType,
            } as NodeAudioParameter;
          }
          if (mimeType === "application/x-buffer-geometry") {
            return {
              data: result.data,
              mimeType,
            } as NodeBufferGeometryParameter;
          }
          if (mimeType === "model/gltf-binary") {
            return {
              data: result.data,
              mimeType,
            } as NodeGltfParameter;
          }
          return {
            data: result.data,
            mimeType,
          } as NodeDocumentParameter;
        })();
      }

      // Handle JSON strings
      if (typeof value === "string") {
        try {
          const parsed = JSON.parse(value);
          // Return parsed JSON (objects, arrays, primitives)
          return parsed;
        } catch (_error) {
          return value;
        }
      }

      // Handle simple types
      return value as NodeParameterValue;
    },
  },
} as const;

type ParameterType = keyof typeof converters;

export async function nodeToApiParameter(
  type: ParameterType,
  value: NodeParameterValue,
  objectStore?: ObjectStore,
  organizationId?: string,
  executionId?: string
): Promise<ApiParameterValue> {
  const converter = converters[type];
  if (!converter) throw new Error(`No converter for type: ${type}`);

  const fn = converter.nodeToApi;

  // Special handling for 'any' type - it decides internally whether it needs objectStore
  if (type === "any") {
    const result = (fn as any)(value, objectStore, organizationId, executionId);
    return await Promise.resolve(result);
  }

  if (fn.length >= 3) {
    if (!objectStore) throw new Error(`ObjectStore required for type: ${type}`);
    if (!organizationId)
      throw new Error(
        `organizationId required for object storage for type: ${type}`
      );

    if (
      type === "image" ||
      type === "document" ||
      type === "audio" ||
      type === "buffergeometry" ||
      type === "gltf"
    ) {
      return await (
        fn as (
          v: NodeParameterValue,
          os: ObjectStore,
          orgId: string,
          execId?: string
        ) => Promise<ApiParameterValue>
      )(value, objectStore, organizationId, executionId);
    }
  } else if (fn.length === 2) {
    if (!objectStore) throw new Error(`ObjectStore required for type: ${type}`);
    return await (
      fn as (
        v: NodeParameterValue,
        os: ObjectStore
      ) => Promise<ApiParameterValue>
    )(value, objectStore);
  } else {
    return await (fn as (v: NodeParameterValue) => Promise<ApiParameterValue>)(
      value
    );
  }
}

export async function apiToNodeParameter(
  type: ParameterType,
  value: ApiParameterValue,
  objectStore?: ObjectStore
): Promise<NodeParameterValue> {
  const converter = converters[type];
  if (!converter) throw new Error(`No converter for type: ${type}`);

  // Special handling for 'any' type - it decides internally whether it needs objectStore
  if (type === "any") {
    const result = (converter.apiToNode as any)(value, objectStore);
    return await Promise.resolve(result);
  }

  if (converter.apiToNode.length === 2) {
    if (!objectStore) throw new Error(`ObjectStore required for type: ${type}`);
    return await (converter.apiToNode as any)(value, objectStore);
  }
  return await (converter.apiToNode as any)(value);
}
