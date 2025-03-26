import { Node, NodeContext, ExecutionResult, NodeType } from "../workflowTypes";
import { ParameterTypeRegistry } from "../typeRegistry";

/**
 * Base class for all executable nodes
 */
export abstract class BaseExecutableNode {
  public readonly node: Node;
  public static readonly nodeType: NodeType;
  protected readonly typeRegistry: ParameterTypeRegistry;

  constructor(node: Node) {
    this.node = node;
    this.typeRegistry = ParameterTypeRegistry.getInstance();
  }

  public abstract execute(context: NodeContext): Promise<ExecutionResult>;

  /**
   * Validates node inputs against their defined types
   */
  protected validateInputs(inputs: Record<string, any>): { isValid: boolean; error?: string } {
    for (const [key, value] of Object.entries(inputs)) {
      const inputDef = (this.constructor as typeof BaseExecutableNode).nodeType.inputs.find(input => input.name === key);
      if (!inputDef) {
        return { isValid: false, error: `Unknown input parameter: ${key}` };
      }

      const type = this.typeRegistry.get(inputDef.type);
      if (!type) {
        return { isValid: false, error: `Unknown parameter type: ${inputDef.type}` };
      }

      const validation = type.validate(value);
      if (!validation.isValid) {
        return { isValid: false, error: `Invalid input for ${key}: ${validation.error}` };
      }
    }
    return { isValid: true };
  }

  /**
   * Validates node outputs against their defined types
   */
  protected validateOutputs(outputs: Record<string, any>): { isValid: boolean; error?: string } {
    for (const [key, value] of Object.entries(outputs)) {
      const outputDef = (this.constructor as typeof BaseExecutableNode).nodeType.outputs.find(output => output.name === key);
      if (!outputDef) {
        return { isValid: false, error: `Unknown output parameter: ${key}` };
      }

      const type = this.typeRegistry.get(outputDef.type);
      if (!type) {
        return { isValid: false, error: `Unknown parameter type: ${outputDef.type}` };
      }

      const validation = type.validate(value);
      if (!validation.isValid) {
        return { isValid: false, error: `Invalid output for ${key}: ${validation.error}` };
      }
    }
    return { isValid: true };
  }

  /**
   * Serializes node outputs according to their defined types
   */
  protected serializeOutputs(outputs: Record<string, any>): Record<string, any> {
    const serialized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(outputs)) {
      const outputDef = (this.constructor as typeof BaseExecutableNode).nodeType.outputs.find(output => output.name === key);
      if (!outputDef) continue;

      const type = this.typeRegistry.get(outputDef.type);
      if (!type) continue;

      serialized[key] = type.serialize(value);
    }
    
    return serialized;
  }

  /**
   * Deserializes node inputs according to their defined types
   */
  protected deserializeInputs(inputs: Record<string, any>): Record<string, any> {
    const deserialized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(inputs)) {
      const inputDef = (this.constructor as typeof BaseExecutableNode).nodeType.inputs.find(input => input.name === key);
      if (!inputDef) continue;

      const type = this.typeRegistry.get(inputDef.type);
      if (!type) continue;

      deserialized[key] = type.deserialize(value);
    }
    
    return deserialized;
  }

  protected createSuccessResult(outputs: Record<string, any>): ExecutionResult {
    // Validate outputs before creating success result
    const validation = this.validateOutputs(outputs);
    if (!validation.isValid) {
      return this.createErrorResult(validation.error || 'Invalid output data');
    }

    // Serialize outputs according to their types
    const serializedOutputs = this.serializeOutputs(outputs);

    return {
      nodeId: this.node.id,
      success: true,
      outputs: serializedOutputs,
    };
  }

  protected createErrorResult(error: string): ExecutionResult {
    return {
      nodeId: this.node.id,
      success: false,
      error,
    };
  }
}
