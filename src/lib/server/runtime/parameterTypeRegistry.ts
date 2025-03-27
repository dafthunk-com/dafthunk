import {
  ParameterType,
  StringParameterType,
  NumberParameterType,
  BooleanParameterType,
  ArrayParameterType,
  BinaryParameterType,
  JsonParameterType,
  ImageParameterType,
  AudioParameterType,
} from "./parameterTypes";

export class ParameterTypeRegistry {
  private static instance: ParameterTypeRegistry;
  private implementations: Map<string, ParameterType> = new Map();

  private constructor() {
    // Register built-in types
    this.register("string", new StringParameterType());
    this.register("number", new NumberParameterType());
    this.register("boolean", new BooleanParameterType());
    this.register("array", new ArrayParameterType());
    this.register("binary", new BinaryParameterType());
    this.register("json", new JsonParameterType());
    this.register("image", new ImageParameterType());
    this.register("audio", new AudioParameterType());
  }

  public static getInstance(): ParameterTypeRegistry {
    if (!ParameterTypeRegistry.instance) {
      ParameterTypeRegistry.instance = new ParameterTypeRegistry();
    }
    return ParameterTypeRegistry.instance;
  }

  public register(type: string, implementation: ParameterType): void {
    this.implementations.set(type, implementation);
  }

  public get(type: string): ParameterType | undefined {
    return this.implementations.get(type);
  }

  public validate(
    type: string,
    value: any
  ): { isValid: boolean; error?: string } {
    const implementation = this.get(type);
    if (!implementation) {
      return { isValid: false, error: `Unknown parameter type: ${type}` };
    }
    return implementation.validate(value);
  }

  public serialize(type: string, value: any): any {
    const implementation = this.get(type);
    if (!implementation) {
      return value;
    }
    return implementation.serialize(value);
  }

  public deserialize(type: string, value: any): any {
    const implementation = this.get(type);
    if (!implementation) {
      return value;
    }
    return implementation.deserialize(value);
  }

  public getDefaultValue(type: string): any {
    const implementation = this.get(type);
    if (!implementation) {
      return null;
    }
    return implementation.getDefaultValue();
  }
}
