import { ParameterConstructor } from "../runtime/types";
import {
  NodeType as RuntimeNodeType,
  Node as RuntimeNode,
} from "../runtime/types";
import { NodeType as ApiNodeType, Node as ApiNode } from "./types";
import {
  ParameterTypeMapping,
  getApiType,
  getRuntimeType,
  convertNodeTypes,
  convertApiNodeTypes,
  convertApiNodes,
} from "./mappers";

import {
  StringParameter as StringRuntimeParameter,
  NumberParameter as NumberRuntimeParameter,
  BooleanParameter as BooleanRuntimeParameter,
  ArrayParameter as ArrayRuntimeParameter,
  BinaryParameter as BinaryRuntimeParameter,
  JsonParameter as JsonRuntimeParameter,
  ImageParameter as ImageRuntimeParameter,
  AudioParameter as AudioRuntimeParameter,
} from "../runtime/types";

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

  public register(runtimeType: ParameterConstructor, apiType: string): void {
    this.typeMappings.push({ runtimeType, apiType });
  }

  public getApiType(runtimeType: ParameterConstructor): string | undefined {
    return getApiType(runtimeType, this.typeMappings);
  }

  public getRuntimeType(apiType: string): ParameterConstructor | undefined {
    return getRuntimeType(apiType, this.typeMappings);
  }

  public convertNodeTypes(nodeTypes: RuntimeNodeType[]): ApiNodeType[] {
    return convertNodeTypes(nodeTypes, this.typeMappings);
  }

  public convertApiNodeTypes(nodeTypes: ApiNodeType[]): RuntimeNodeType[] {
    return convertApiNodeTypes(nodeTypes, this.typeMappings);
  }

  public convertApiNodes(nodes: ApiNode[]): RuntimeNode[] {
    return convertApiNodes(nodes, this.typeMappings);
  }
}
