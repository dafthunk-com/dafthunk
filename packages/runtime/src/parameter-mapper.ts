import type {
  ParameterValue as ApiParameterValue,
  ObjectReference,
} from "@dafthunk/types";
import {
  isObjectReference,
  type AudioParameter as NodeAudioParameter,
  type BlobParameter as NodeBlobParameter,
  type DocumentParameter as NodeDocumentParameter,
  type GltfParameter as NodeGltfParameter,
  type ImageParameter as NodeImageParameter,
  type ParameterValue as NodeParameterValue,
  type VideoParameter as NodeVideoParameter,
} from "./node-types";
import type { ObjectStore } from "./object-store";

/**
 * Type guard for native BlobParameter (Uint8Array only).
 * Used for parameter mapping where we work with in-memory data.
 */
function isNativeBlobParameter(value: unknown): value is NodeBlobParameter {
  return (
    !!value &&
    typeof value === "object" &&
    "data" in value &&
    "mimeType" in value &&
    value.data instanceof Uint8Array &&
    typeof value.mimeType === "string"
  );
}

// Alias type guards - all semantic blob types have the same structure
const isImageParameter = isNativeBlobParameter as (
  value: unknown
) => value is NodeImageParameter;
const isDocumentParameter = isNativeBlobParameter as (
  value: unknown
) => value is NodeDocumentParameter;
const isAudioParameter = isNativeBlobParameter as (
  value: unknown
) => value is NodeAudioParameter;
const isGltfParameter = isNativeBlobParameter as (
  value: unknown
) => value is NodeGltfParameter;
const isVideoParameter = isNativeBlobParameter as (
  value: unknown
) => value is NodeVideoParameter;

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

// Factory functions for blob-like converters (blob, image, document, audio, gltf)
// All blob types share identical read/write logic; only the type guard differs.
function createBlobNodeToApi(
  typeGuard: (value: unknown) => value is NodeBlobParameter
) {
  return async (
    value: NodeParameterValue,
    objectStore?: ObjectStore,
    organizationId?: string,
    executionId?: string
  ) => {
    if (!typeGuard(value)) return undefined;
    if (!objectStore || !organizationId) {
      throw new Error("ObjectStore and organizationId required for blob type");
    }
    const blob = new Blob([value.data], { type: value.mimeType });
    const buffer = await blob.arrayBuffer();
    const data = new Uint8Array(buffer);
    return await objectStore.writeObject(
      data,
      blob.type,
      organizationId,
      executionId,
      value.filename
    );
  };
}

function createBlobApiToNode() {
  return async (value: ApiParameterValue, objectStore?: ObjectStore) => {
    if (
      !value ||
      typeof value !== "object" ||
      !("id" in value) ||
      !("mimeType" in value)
    )
      return undefined;
    if (!objectStore) {
      throw new Error("ObjectStore required for blob type");
    }
    const result = await objectStore.readObject(value as ObjectReference);
    if (!result) return undefined;
    const objRef = value as ObjectReference;
    const param: NodeBlobParameter = {
      data: result.data,
      mimeType: objRef.mimeType,
    };
    if (objRef.filename) {
      param.filename = objRef.filename;
    }
    return param;
  };
}

// Uniform converter interface — all converters share the same signature.
// Value converters ignore the extra params; blob converters validate them internally.
interface Converter {
  nodeToApi: (
    value: NodeParameterValue,
    objectStore?: ObjectStore,
    organizationId?: string,
    executionId?: string
  ) => Promise<ApiParameterValue> | ApiParameterValue;
  apiToNode: (
    value: ApiParameterValue,
    objectStore?: ObjectStore
  ) => Promise<NodeParameterValue> | NodeParameterValue;
}

// Static mapping of converters
const converters: Record<string, Converter> = {
  string: {
    nodeToApi: typeValidatingNodeToApi("string"),
    apiToNode: typeValidatingApiToNode("string"),
  },
  date: {
    nodeToApi: (value: NodeParameterValue) => {
      if (typeof value === "string") {
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
      }
      if (value instanceof Date) return value.toISOString();
      if (typeof value === "number") {
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
      }
      return undefined;
    },
    apiToNode: (value: ApiParameterValue) => {
      if (typeof value === "string") {
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
      }
      if (typeof value === "number") {
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
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
  blob: {
    nodeToApi: createBlobNodeToApi(isNativeBlobParameter),
    apiToNode: createBlobApiToNode(),
  },
  image: {
    nodeToApi: createBlobNodeToApi(isImageParameter),
    apiToNode: createBlobApiToNode(),
  },
  document: {
    nodeToApi: createBlobNodeToApi(isDocumentParameter),
    apiToNode: createBlobApiToNode(),
  },
  audio: {
    nodeToApi: createBlobNodeToApi(isAudioParameter),
    apiToNode: createBlobApiToNode(),
  },
  gltf: {
    nodeToApi: createBlobNodeToApi(isGltfParameter),
    apiToNode: createBlobApiToNode(),
  },
  video: {
    nodeToApi: createBlobNodeToApi(isVideoParameter),
    apiToNode: createBlobApiToNode(),
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
  database: {
    nodeToApi: typeValidatingNodeToApi("string"),
    apiToNode: typeValidatingApiToNode("string"),
  },
  dataset: {
    nodeToApi: typeValidatingNodeToApi("string"),
    apiToNode: typeValidatingApiToNode("string"),
  },
  queue: {
    nodeToApi: typeValidatingNodeToApi("string"),
    apiToNode: typeValidatingApiToNode("string"),
  },
  email: {
    nodeToApi: typeValidatingNodeToApi("string"),
    apiToNode: typeValidatingApiToNode("string"),
  },
  integration: {
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
        isGltfParameter(value) ||
        isVideoParameter(value)
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
        if (isGltfParameter(value)) {
          return converters.gltf.nodeToApi(
            value,
            objectStore,
            organizationId,
            executionId
          );
        }
        if (isVideoParameter(value)) {
          return converters.video.nodeToApi(
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

          const objRef = value as ObjectReference;
          const mimeType = objRef.mimeType;
          const baseParam = {
            data: result.data,
            mimeType,
            ...(objRef.filename && { filename: objRef.filename }),
          };
          if (mimeType.startsWith("image/")) {
            return baseParam as NodeImageParameter;
          }
          if (mimeType.startsWith("audio/")) {
            return baseParam as NodeAudioParameter;
          }
          if (mimeType.startsWith("video/")) {
            return baseParam as NodeVideoParameter;
          }
          if (mimeType === "model/gltf-binary") {
            return baseParam as NodeGltfParameter;
          }
          return baseParam as NodeDocumentParameter;
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
};

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
  return Promise.resolve(
    converter.nodeToApi(value, objectStore, organizationId, executionId)
  );
}

export async function apiToNodeParameter(
  type: ParameterType,
  value: ApiParameterValue,
  objectStore?: ObjectStore
): Promise<NodeParameterValue> {
  const converter = converters[type];
  if (!converter) throw new Error(`No converter for type: ${type}`);
  return Promise.resolve(converter.apiToNode(value, objectStore));
}
