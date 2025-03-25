import { BaseExecutableNode } from "../baseNode";
import { NodeContext, ExecutionResult, NodeType } from "../../workflowTypes";

/**
 * NumberInput node implementation
 * This node provides a number input widget that outputs the entered numeric value.
 *
 * The number input's current value is stored as an input parameter named "value"
 * and passed directly to the output. It supports optional min, max, and step constraints.
 */
export class NumberInputNode extends BaseExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "number-input",
    name: "Number Input",
    type: "number-input",
    description: "A number input widget for entering numeric values",
    category: "Widgets",
    icon: "number",
    inputs: [
      {
        name: "value",
        type: "number",
        description: "Current numeric value in the input",
        hidden: true,
        value: 0 // Default to 0
      },
      {
        name: "min",
        type: "number",
        description: "Minimum allowed value",
        hidden: true,
        value: undefined // Optional
      },
      {
        name: "max",
        type: "number",
        description: "Maximum allowed value",
        hidden: true,
        value: undefined // Optional
      },
      {
        name: "step",
        type: "number",
        description: "Step size for increment/decrement",
        hidden: true,
        value: undefined // Optional
      },
      {
        name: "placeholder",
        type: "string",
        description: "Placeholder text to show when empty",
        hidden: true,
        value: undefined // Optional
      }
    ],
    outputs: [
      {
        name: "value",
        type: "number",
        description: "The current numeric value from the input",
      },
    ],
  };

  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const value = context.inputs.value as number;
      const min = context.inputs.min as number | undefined;
      const max = context.inputs.max as number | undefined;
      const step = context.inputs.step as number | undefined;
      const placeholder = context.inputs.placeholder as string | undefined;

      // Validate inputs
      if (typeof value !== "number" || isNaN(value)) {
        return this.createErrorResult("Value must be a valid number");
      }

      if (min !== undefined && (typeof min !== "number" || isNaN(min))) {
        return this.createErrorResult("Min must be a valid number or undefined");
      }

      if (max !== undefined && (typeof max !== "number" || isNaN(max))) {
        return this.createErrorResult("Max must be a valid number or undefined");
      }

      if (step !== undefined && (typeof step !== "number" || isNaN(step) || step <= 0)) {
        return this.createErrorResult("Step must be a positive number or undefined");
      }

      if (placeholder !== undefined && typeof placeholder !== "string") {
        return this.createErrorResult("Placeholder must be a string or undefined");
      }

      // Validate value constraints
      if (min !== undefined && value < min) {
        return this.createErrorResult(`Value must be greater than or equal to ${min}`);
      }

      if (max !== undefined && value > max) {
        return this.createErrorResult(`Value must be less than or equal to ${max}`);
      }

      return this.createSuccessResult({
        value: value,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
} 