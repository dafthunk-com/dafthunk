import {
  ParameterValue as ApiParameterValue,
  JsonArray,
} from "@dafthunk/types";
import {
  ParameterValue as NodeParameterValue,
  ImageParameter as NodeImageParameter,
  DocumentParameter as NodeDocumentParameter,
  AudioParameter as NodeAudioParameter,
} from "./types";
import { ObjectStore } from "../runtime/objectStore";
import { ObjectReference } from "@dafthunk/types";

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
function isPlainJsonObject(value: unknown): value is Record<string, any> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (
    isImageParameter(value) ||
    isDocumentParameter(value) ||
    isAudioParameter(value)
  )
    return false;
  if (value instanceof Uint8Array) return false;
  return true;
}
function isJsonArray(value: unknown): value is JsonArray {
  if (!Array.isArray(value)) return false;
  if (
    isImageParameter(value) ||
    isDocumentParameter(value) ||
    isAudioParameter(value)
  )
    return false;
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

// Static mapping of converters
const converters = {
  string: {
    nodeToApi: (value: NodeParameterValue) =>
      typeof value === "string" ? value : undefined,
    apiToNode: (value: ApiParameterValue) =>
      typeof value === "string" ? value : undefined,
  },
  number: {
    nodeToApi: (value: NodeParameterValue) =>
      typeof value === "number" ? value : undefined,
    apiToNode: (value: ApiParameterValue) =>
      typeof value === "number" ? value : undefined,
  },
  boolean: {
    nodeToApi: (value: NodeParameterValue) =>
      typeof value === "boolean" ? value : undefined,
    apiToNode: (value: ApiParameterValue) =>
      typeof value === "boolean" ? value : undefined,
  },
  image: {
    nodeToApi: async (value: NodeParameterValue, objectStore: ObjectStore) => {
      if (!isImageParameter(value)) return undefined;
      const blob = new Blob([value.data], { type: value.mimeType });
      const buffer = await blob.arrayBuffer();
      const data = new Uint8Array(buffer);
      return await objectStore.writeObject(data, blob.type);
    },
    apiToNode: async (value: ApiParameterValue, objectStore: ObjectStore) => {
      if (
        !value ||
        typeof value !== "object" ||
        !("id" in value) ||
        !("mimeType" in value)
      )
        return undefined;
      const data = await objectStore.readObject(value as ObjectReference);
      return {
        data,
        mimeType: (value as ObjectReference).mimeType,
      } as NodeImageParameter;
    },
  },
  document: {
    nodeToApi: async (value: NodeParameterValue, objectStore: ObjectStore) => {
      if (!isDocumentParameter(value)) return undefined;
      const blob = new Blob([value.data], { type: value.mimeType });
      const buffer = await blob.arrayBuffer();
      const data = new Uint8Array(buffer);
      return await objectStore.writeObject(data, blob.type);
    },
    apiToNode: async (value: ApiParameterValue, objectStore: ObjectStore) => {
      if (
        !value ||
        typeof value !== "object" ||
        !("id" in value) ||
        !("mimeType" in value)
      )
        return undefined;
      const data = await objectStore.readObject(value as ObjectReference);
      return {
        data,
        mimeType: (value as ObjectReference).mimeType,
      } as NodeDocumentParameter;
    },
  },
  audio: {
    nodeToApi: async (value: NodeParameterValue, objectStore: ObjectStore) => {
      if (!isAudioParameter(value)) return undefined;
      const blob = new Blob([value.data], { type: value.mimeType });
      const buffer = await blob.arrayBuffer();
      const data = new Uint8Array(buffer);
      return await objectStore.writeObject(data, blob.type);
    },
    apiToNode: async (value: ApiParameterValue, objectStore: ObjectStore) => {
      if (
        !value ||
        typeof value !== "object" ||
        !("id" in value) ||
        !("mimeType" in value)
      )
        return undefined;
      const data = await objectStore.readObject(value as ObjectReference);
      return {
        data,
        mimeType: (value as ObjectReference).mimeType,
      } as NodeAudioParameter;
    },
  },
  array: {
    nodeToApi: (value: NodeParameterValue) =>
      (isJsonArray(value) ? value : undefined) as ApiParameterValue,
    apiToNode: (value: ApiParameterValue) =>
      (isJsonArray(value) ? value : undefined) as NodeParameterValue,
  },
  json: {
    nodeToApi: (value: NodeParameterValue) =>
      (isPlainJsonObject(value) ? value : undefined) as ApiParameterValue,
    apiToNode: (value: ApiParameterValue) =>
      (isPlainJsonObject(value) ? value : undefined) as NodeParameterValue,
  },
} as const;

type ParameterType = keyof typeof converters;

export async function nodeToApiParameter(
  type: ParameterType,
  value: NodeParameterValue,
  objectStore?: ObjectStore
): Promise<ApiParameterValue> {
  const converter = converters[type];
  if (!converter) throw new Error(`No converter for type: ${type}`);
  if (converter.nodeToApi.length === 2) {
    // expects objectStore
    if (!objectStore) throw new Error(`ObjectStore required for type: ${type}`);
    return await (converter.nodeToApi as any)(value, objectStore);
  }
  return await (converter.nodeToApi as any)(value);
}

export async function apiToNodeParameter(
  type: ParameterType,
  value: ApiParameterValue,
  objectStore?: ObjectStore
): Promise<NodeParameterValue> {
  const converter = converters[type];
  if (!converter) throw new Error(`No converter for type: ${type}`);
  if (converter.apiToNode.length === 2) {
    if (!objectStore) throw new Error(`ObjectStore required for type: ${type}`);
    return await (converter.apiToNode as any)(value, objectStore);
  }
  return await (converter.apiToNode as any)(value);
}

export function getRegisteredParameterTypes(): ParameterType[] {
  return Object.keys(converters) as ParameterType[];
}
