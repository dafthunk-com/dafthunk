import {
  StringParameter as StringRuntimeParameter,
  NumberParameter as NumberRuntimeParameter,
  BooleanParameter as BooleanRuntimeParameter,
  ArrayParameter as ArrayRuntimeParameter,
  BinaryParameter as BinaryRuntimeParameter,
  JsonParameter as JsonRuntimeParameter,
  ImageParameter as ImageRuntimeParameter,
  AudioParameter as AudioRuntimeParameter,
  ParameterConstructor as RuntimeParameterConstructor,
} from "../runtime/types";

import {
  NodeType as RuntimeNodeType,
  Node as RuntimeNode,
} from "../runtime/types";

import { NodeType as ApiNodeType, Node as ApiNode } from "./types";

export type ParameterTypeMapping = {
  runtimeType: RuntimeParameterConstructor;
  apiType: string;
};

export const defaultTypeMappings: ParameterTypeMapping[] = [
  { runtimeType: StringRuntimeParameter, apiType: "string" },
  { runtimeType: NumberRuntimeParameter, apiType: "number" },
  { runtimeType: BooleanRuntimeParameter, apiType: "boolean" },
  { runtimeType: ArrayRuntimeParameter, apiType: "array" },
  { runtimeType: BinaryRuntimeParameter, apiType: "binary" },
  { runtimeType: JsonRuntimeParameter, apiType: "json" },
  { runtimeType: ImageRuntimeParameter, apiType: "image" },
  { runtimeType: AudioRuntimeParameter, apiType: "audio" },
];

export function getApiType(
  runtimeType: RuntimeParameterConstructor,
  typeMappings: ParameterTypeMapping[]
): string | undefined {
  return typeMappings.find((mapping) => mapping.runtimeType === runtimeType)
    ?.apiType;
}

export function getRuntimeType(
  apiType: string,
  typeMappings: ParameterTypeMapping[]
): RuntimeParameterConstructor | undefined {
  return typeMappings.find((mapping) => mapping.apiType === apiType)
    ?.runtimeType;
}

export function convertNodeTypes(
  nodeTypes: RuntimeNodeType[],
  typeMappings: ParameterTypeMapping[]
): ApiNodeType[] {
  return nodeTypes.map((type) => {
    const inputs = type.inputs.map((input) => {
      const apiType = getApiType(input.type, typeMappings);
      if (!apiType) {
        throw new Error(`Unknown parameter type: ${input.type}`);
      }
      const value = input.value ? new input.type(input.value) : undefined;
      return { ...input, type: apiType, value };
    });
    const outputs = type.outputs.map((output) => {
      const apiType = getApiType(output.type, typeMappings);
      if (!apiType) {
        throw new Error(`Unknown parameter type: ${output.type}`);
      }
      const value = output.value ? new output.type(output.value) : undefined;
      return { ...output, type: apiType, value };
    });
    return { ...type, inputs, outputs };
  });
}

export function convertApiNodeTypes(
  nodeTypes: ApiNodeType[],
  typeMappings: ParameterTypeMapping[]
): RuntimeNodeType[] {
  return nodeTypes.map((type) => {
    const inputs = type.inputs.map((input) => {
      const runtimeType = getRuntimeType(input.type, typeMappings);
      if (!runtimeType) {
        throw new Error(`Unknown API type: ${input.type}`);
      }
      const value = input.value ? new runtimeType(input.value) : undefined;
      return { ...input, type: runtimeType, value };
    });
    const outputs = type.outputs.map((output) => {
      const runtimeType = getRuntimeType(output.type, typeMappings);
      if (!runtimeType) {
        throw new Error(`Unknown API type: ${output.type}`);
      }
      const value = output.value ? new runtimeType(output.value) : undefined;
      return { ...output, type: runtimeType, value };
    });
    return { ...type, inputs, outputs };
  });
}

export function convertApiNodes(
  nodes: ApiNode[],
  typeMappings: ParameterTypeMapping[]
): RuntimeNode[] {
  return nodes.map((node) => {
    const inputs = node.inputs.map((input) => {
      const runtimeType = getRuntimeType(input.type, typeMappings);
      if (!runtimeType) {
        throw new Error(`Unknown API type: ${input.type}`);
      }
      const value = input.value ? new runtimeType(input.value) : undefined;
      return { ...input, type: runtimeType, value };
    });

    const outputs = node.outputs.map((output) => {
      const runtimeType = getRuntimeType(output.type, typeMappings);
      if (!runtimeType) {
        throw new Error(`Unknown API type: ${output.type}`);
      }
      const value = output.value ? new runtimeType(output.value) : undefined;
      return { ...output, type: runtimeType, value };
    });

    return {
      ...node,
      inputs,
      outputs,
    };
  });
}
