import { RuntimeParameterConstructor } from "../runtime/types";
import {
  NodeType as RuntimeNodeType,
  Node as RuntimeNode,
} from "../runtime/types";
import { NodeType as ApiNodeType, Node as ApiNode } from "./types";
import {
  ParameterTypeMapping,
  defaultTypeMappings,
  getApiType,
  getRuntimeType,
  convertNodeTypes,
  convertApiNodeTypes,
  convertApiNodes,
} from "./mappers";

export class ApiParameterRegistry {
  private static instance: ApiParameterRegistry;
  private typeMappings: ParameterTypeMapping[] = [];

  private constructor() {
    // Register built-in types
    this.typeMappings = [...defaultTypeMappings];
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
    return getApiType(runtimeType, this.typeMappings);
  }

  public getRuntimeType(
    apiType: string
  ): RuntimeParameterConstructor | undefined {
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
