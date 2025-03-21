import { BaseExecutableNode } from "../baseNode";
import { NodeContext, ExecutionResult, NodeType } from "../../workflowTypes";

/**
 * Slider node implementation
 * This node provides a slider widget that outputs a selected value
 * constrained by min, max, and step values.
 *
 * The slider's current value is stored as an input parameter named "value"
 * and passed directly to the output.
 */
export class SliderNode extends BaseExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "slider",
    name: "Slider",
    type: "slider",
    description:
      "A slider widget for selecting a value constrained by min, max, and step values",
    category: "Widgets",
    icon: "sliders-horizontal",
    inputs: [
      {
        name: "min",
        type: "number",
        description: "Minimum value of the slider",
      },
      {
        name: "max",
        type: "number",
        description: "Maximum value of the slider",
      },
      { name: "step", type: "number", description: "Step size for the slider" },
      {
        name: "value",
        type: "number",
        description: "Current value of the slider",
      },
    ],
    outputs: [
      {
        name: "value",
        type: "number",
        description: "The selected value from the slider",
      },
    ],
  };

  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const min = Number(context.inputs.min);
      const max = Number(context.inputs.max);
      const step = Number(context.inputs.step);
      const value = Number(context.inputs.value);

      // Validate inputs
      if (isNaN(min)) {
        return this.createErrorResult("Min value must be a number");
      }

      if (isNaN(max)) {
        return this.createErrorResult("Max value must be a number");
      }

      if (isNaN(step)) {
        return this.createErrorResult("Step value must be a number");
      }

      if (step <= 0) {
        return this.createErrorResult("Step value must be greater than 0");
      }

      if (min >= max) {
        return this.createErrorResult("Min value must be less than max value");
      }

      // Use the input value as the output, constrained by min/max
      // If no value is provided, use min as default
      const outputValue = !isNaN(value)
        ? Math.min(Math.max(value, min), max)
        : min;

      return this.createSuccessResult({
        value: outputValue,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
