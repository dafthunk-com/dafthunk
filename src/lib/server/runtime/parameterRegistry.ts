import {
  ParameterValueConstructor as RuntimeParameterValueConstructor,
  StringValue as RuntimeStringParameter,
  NumberValue as RuntimeNumberParameter,
  BooleanValue as RuntimeBooleanParameter,
  ArrayValue as RuntimeArrayParameter,
  BinaryValue as RuntimeBinaryParameter,
  JsonValue as RuntimeJsonParameter,
  ImageValue as RuntimeImageParameter,
  AudioValue as RuntimeAudioParameter,
} from "./types";
import {
  ParameterValue as NodeParameterValue,
  StringValue as NodeStringValue,
  NumberValue as NodeNumberValue,
  BooleanValue as NodeBooleanValue,
  ArrayValue as NodeArrayValue,
  BinaryValue as NodeBinaryValue,
  ImageValue as NodeImageValue,
  JsonValue as NodeJsonValue,
  AudioValue as NodeAudioValue,
} from "../nodes/types";

export class ParameterRegistry {
  private static instance: ParameterRegistry;
  private implementations: Map<
    typeof NodeParameterValue,
    RuntimeParameterValueConstructor
  > = new Map();

  private constructor() {
    // Register built-in types
    this.register(NodeStringValue, RuntimeStringParameter);
    this.register(NodeNumberValue, RuntimeNumberParameter);
    this.register(NodeBooleanValue, RuntimeBooleanParameter);
    this.register(NodeArrayValue, RuntimeArrayParameter);
    this.register(NodeBinaryValue, RuntimeBinaryParameter);
    this.register(NodeJsonValue, RuntimeJsonParameter);
    this.register(NodeImageValue, RuntimeImageParameter);
    this.register(NodeAudioValue, RuntimeAudioParameter);
  }

  public static getInstance(): ParameterRegistry {
    if (!ParameterRegistry.instance) {
      ParameterRegistry.instance = new ParameterRegistry();
    }
    return ParameterRegistry.instance;
  }

  public register(
    type: typeof NodeParameterValue,
    implementation: RuntimeParameterValueConstructor
  ): void {
    this.implementations.set(type, implementation);
  }

  public get(
    type: typeof NodeParameterValue
  ): RuntimeParameterValueConstructor | undefined {
    return this.implementations.get(type);
  }

  public validate(
    type: typeof NodeParameterValue,
    value: any
  ): { isValid: boolean; error?: string } {
    const Implementation = this.get(type);
    if (!Implementation) {
      return { isValid: false, error: `Unknown parameter type: ${type}` };
    }
    return new Implementation(value).validate();
  }
}
