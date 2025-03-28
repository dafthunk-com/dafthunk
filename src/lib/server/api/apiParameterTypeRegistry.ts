import {
  StringRuntimeParameter,
  NumberRuntimeParameter,
  BooleanRuntimeParameter,
  ArrayRuntimeParameter,
  BinaryRuntimeParameter,
  JsonRuntimeParameter,
  ImageRuntimeParameter,
  AudioRuntimeParameter,
  RuntimeParameterConstructor,
} from "../runtime/runtimeTypes";
import {
  NodeType as RuntimeNodeType,
  Node as RuntimeNode,
} from "../runtime/runtimeTypes";
import { NodeType as ApiNodeType, Node as ApiNode } from "./apiTypes";

type ParameterTypeMapping = {
  runtimeType: RuntimeParameterConstructor;
  apiType: string;
};

export class ApiParameterRegistry {
  private static instance: ApiParameterRegistry;
  private typeMappings: ParameterTypeMapping[] = [];

  private constructor() {
    // Register built-in types
    this.register(StringRuntimeParameter, "string");
    this.register(NumberRuntimeParameter, "number");
    this.register(BooleanRuntimeParameter, "boolean");
    this.register(ArrayRuntimeParameter, "array");
    this.register(BinaryRuntimeParameter, "binary");
    this.register(JsonRuntimeParameter, "json");
    this.register(ImageRuntimeParameter, "image");
    this.register(AudioRuntimeParameter, "audio");
  }

  public static getInstance(): ApiParameterRegistry {
    if (!ApiParameterRegistry.instance) {
      ApiParameterRegistry.instance = new ApiParameterRegistry();
    }
    return ApiParameterRegistry.instance;
  }

  public register(
    runtimeType: RuntimeParameterConstructor,
    apiType: string
  ): void {
    this.typeMappings.push({ runtimeType, apiType });
  }

  public getApiType(
    runtimeType: RuntimeParameterConstructor
  ): string | undefined {
    return this.typeMappings.find(
      (mapping) => mapping.runtimeType === runtimeType
    )?.apiType;
  }

  public getRuntimeType(
    apiType: string
  ): RuntimeParameterConstructor | undefined {
    return this.typeMappings.find((mapping) => mapping.apiType === apiType)
      ?.runtimeType;
  }

  public convertNodeTypes(nodeTypes: RuntimeNodeType[]): ApiNodeType[] {
    return nodeTypes.map((type) => {
      const inputs = type.inputs.map((input) => {
        const apiType = this.getApiType(input.type);
        if (!apiType) {
          throw new Error(`Unknown parameter type: ${input.type}`);
        }
        const value = input.value ? new input.type(input.value) : undefined;
        return { ...input, type: apiType, value };
      });
      const outputs = type.outputs.map((output) => {
        const apiType = this.getApiType(output.type);
        if (!apiType) {
          throw new Error(`Unknown parameter type: ${output.type}`);
        }
        const value = output.value ? new output.type(output.value) : undefined;
        return { ...output, type: apiType, value };
      });
      return { ...type, inputs, outputs };
    });
  }

  public convertApiNodeTypes(nodeTypes: ApiNodeType[]): RuntimeNodeType[] {
    return nodeTypes.map((type) => {
      const inputs = type.inputs.map((input) => {
        const runtimeType = this.getRuntimeType(input.type);
        if (!runtimeType) {
          throw new Error(`Unknown API type: ${input.type}`);
        }
        const value = input.value ? new runtimeType(input.value) : undefined;
        return { ...input, type: runtimeType, value };
      });
      const outputs = type.outputs.map((output) => {
        const runtimeType = this.getRuntimeType(output.type);
        if (!runtimeType) {
          throw new Error(`Unknown API type: ${output.type}`);
        }
        const value = output.value ? new runtimeType(output.value) : undefined;
        return { ...output, type: runtimeType, value };
      });
      return { ...type, inputs, outputs };
    });
  }

  public convertApiNodes(nodes: ApiNode[]): RuntimeNode[] {
    return nodes.map((node) => {
      const inputs = node.inputs.map((input) => {
        const runtimeType = this.getRuntimeType(input.type);
        if (!runtimeType) {
          throw new Error(`Unknown API type: ${input.type}`);
        }
        const value = input.value ? new runtimeType(input.value) : undefined;
        return { ...input, type: runtimeType, value };
      });

      const outputs = node.outputs.map((output) => {
        const runtimeType = this.getRuntimeType(output.type);
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
}
