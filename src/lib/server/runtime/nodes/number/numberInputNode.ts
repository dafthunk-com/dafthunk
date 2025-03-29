import { ExecutableNode } from "../types";
import { NodeContext, ExecutionResult } from "../../types";
import { NodeType } from "../types";
import { NumberNodeParameter, StringNodeParameter } from "../types";

/**
 * NumberInput node implementation
 * This node provides a number input widget that outputs the entered numeric value.
 *
 * The number input's current value is stored as an input parameter named "value"
 * and passed directly to the output. It supports optional min, max, and step constraints.
 */
export class NumberInputNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "number-input",
    name: "Number Input",
    type: "number-input",
    description: "A number input widget for entering numeric values",
    category: "Number",
    icon: "number",
    inputs: [
      {
        name: "value",
        type: NumberNodeParameter,
        description: "Current numeric value in the input",
        hidden: true,
        value: new NumberNodeParameter(0), // Default to 0
      },
      {
        name: "min",
        type: NumberNodeParameter,
        description: "Minimum allowed value",
        hidden: true,
        value: undefined, // Optional
      },
      {
        name: "max",
        type: NumberNodeParameter,
        description: "Maximum allowed value",
        hidden: true,
        value: undefined, // Optional
      },
      {
        name: "step",
        type: NumberNodeParameter,
        description: "Step size for increment/decrement",
        hidden: true,
        value: undefined, // Optional
      },
      {
        name: "placeholder",
        type: StringNodeParameter,
        description: "Placeholder text to show when empty",
        hidden: true,
        value: undefined, // Optional
      },
    ],
    outputs: [
      {
        name: "value",
        type: NumberNodeParameter,
        description: "The current numeric value from the input",
      },
    ],
  };

  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const { value, min, max } = context.inputs;

      // Validate value constraints
      if (min !== undefined && value < min) {
        return this.createErrorResult(
          `Value must be greater than or equal to ${min}`
        );
      }

      if (max !== undefined && value > max) {
        return this.createErrorResult(
          `Value must be less than or equal to ${max}`
        );
      }

      return this.createSuccessResult({
        value: new NumberNodeParameter(value),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
