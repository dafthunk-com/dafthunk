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
} from "./runtimeParameterTypes";
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
} from "./nodes/nodeParameterTypes";

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
