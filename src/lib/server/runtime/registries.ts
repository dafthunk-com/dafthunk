import {
  RuntimeParameterConstructor,
  StringRuntimeParameter,
  NumberRuntimeParameter,
  BooleanRuntimeParameter,
  ArrayRuntimeParameter,
  BinaryRuntimeParameter,
  JsonRuntimeParameter,
  ImageRuntimeParameter,
  AudioRuntimeParameter,
  Node,
  NodeType,
} from "./types";
import {
  NodeParameter,
  StringNodeParameter,
  NumberNodeParameter,
  BooleanNodeParameter,
  ArrayNodeParameter,
  BinaryNodeParameter,
  ImageNodeParameter,
  JsonNodeParameter,
  AudioNodeParameter,
} from "./nodes/types";
import { ExecutableNode } from "./nodes/types";
import { NodeType as NodeTypeDefinition } from "./nodes/types";

export class RuntimeParameterRegistry {
  private static instance: RuntimeParameterRegistry;
  private implementations: Map<
    typeof NodeParameter,
    RuntimeParameterConstructor
  > = new Map();

  private constructor() {
    // Register built-in types
    this.register(StringNodeParameter, StringRuntimeParameter);
    this.register(NumberNodeParameter, NumberRuntimeParameter);
    this.register(BooleanNodeParameter, BooleanRuntimeParameter);
    this.register(ArrayNodeParameter, ArrayRuntimeParameter);
    this.register(BinaryNodeParameter, BinaryRuntimeParameter);
    this.register(JsonNodeParameter, JsonRuntimeParameter);
    this.register(ImageNodeParameter, ImageRuntimeParameter);
    this.register(AudioNodeParameter, AudioRuntimeParameter);
  }

  public static getInstance(): RuntimeParameterRegistry {
    if (!RuntimeParameterRegistry.instance) {
      RuntimeParameterRegistry.instance = new RuntimeParameterRegistry();
    }
    return RuntimeParameterRegistry.instance;
  }

  public register(
    type: typeof NodeParameter,
    implementation: RuntimeParameterConstructor
  ): void {
    this.implementations.set(type, implementation);
  }

  public get(
    type: typeof NodeParameter
  ): RuntimeParameterConstructor | undefined {
    return this.implementations.get(type);
  }

  public validate(
    type: typeof NodeParameter,
    value: any
  ): { isValid: boolean; error?: string } {
    const Implementation = this.get(type);
    if (!Implementation) {
      return { isValid: false, error: `Unknown parameter type: ${type}` };
    }
    return new Implementation(value).validate();
  }
}
export interface NodeImplementationConstructor {
  new (node: Node): ExecutableNode;
  readonly nodeType: NodeTypeDefinition;
}

export class NodeRegistry {
  private static instance: NodeRegistry;
  private implementations: Map<string, NodeImplementationConstructor> =
    new Map();
  private parameterRegistry: RuntimeParameterRegistry =
    RuntimeParameterRegistry.getInstance();

  public static getInstance(): NodeRegistry {
    if (!NodeRegistry.instance) {
      NodeRegistry.instance = new NodeRegistry();
    }
    return NodeRegistry.instance;
  }

  public registerImplementation(
    Implementation: NodeImplementationConstructor
  ): void {
    if (!Implementation?.nodeType?.type) {
      throw new Error("NodeType is not defined");
    }
    this.implementations.set(Implementation.nodeType.type, Implementation);
  }

  public createExecutableNode(node: Node): ExecutableNode | undefined {
    const Implementation = this.implementations.get(node.type);
    if (!Implementation) {
      return undefined;
    }
    return new Implementation(node);
  }

  public getRuntimeNodeTypes(): NodeType[] {
    return Array.from(this.implementations.values()).map((implementation) => {
      const inputs = implementation.nodeType.inputs.map((input) => {
        const Type = this.parameterRegistry.get(input.type);
        if (!Type) {
          throw new Error(`Unknown parameter type: ${input.type}`);
        }
        const value = input.value ? new Type(input.value) : undefined;
        return {
          ...input,
          type: Type,
          value,
        };
      });
      const outputs = implementation.nodeType.outputs.map((output) => {
        const Type = this.parameterRegistry.get(output.type);
        if (!Type) {
          throw new Error(`Unknown parameter type: ${output.type}`);
        }
        const value = output.value ? new Type(output.value) : undefined;
        return {
          ...output,
          type: Type,
          value,
        };
      });
      return {
        ...implementation.nodeType,
        inputs,
        outputs,
      };
    });
  }
}
