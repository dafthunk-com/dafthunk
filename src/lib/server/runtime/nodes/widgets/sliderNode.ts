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
        hidden: true,
        value: 0,
      },
      {
        name: "max",
        type: "number",
        description: "Maximum value of the slider",
        hidden: true,
        value: 100,
      },
      {
        name: "step",
        type: "number",
        description: "Step size for the slider",
        hidden: true,
        value: 1,
      },
      {
        name: "value",
        type: "number",
        description: "Current value of the slider",
        hidden: true,
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
      // Get default values from nodeType
      const defaultMin = SliderNode.nodeType.inputs.find(
        (i) => i.name === "min"
      )?.value as number;
      const defaultMax = SliderNode.nodeType.inputs.find(
        (i) => i.name === "max"
      )?.value as number;
      const defaultStep = SliderNode.nodeType.inputs.find(
        (i) => i.name === "step"
      )?.value as number;

      // Use provided values or defaults
      const min =
        context.inputs.min !== undefined
          ? Number(context.inputs.min)
          : defaultMin;
      const max =
        context.inputs.max !== undefined
          ? Number(context.inputs.max)
          : defaultMax;
      const step =
        context.inputs.step !== undefined
          ? Number(context.inputs.step)
          : defaultStep;
      const value =
        context.inputs.value !== undefined
          ? Number(context.inputs.value)
          : undefined;

      // Ensure all inputs are valid numbers
      if (isNaN(min) || isNaN(max) || isNaN(step)) {
        return this.createErrorResult(
          "Invalid input parameters: min, max, and step must be numbers"
        );
      }

      // Validate min/max relationship
      if (min >= max) {
        return this.createErrorResult("Min value must be less than max value");
      }

      // Validate step
      if (step <= 0) {
        return this.createErrorResult("Step value must be greater than 0");
      }

      // Calculate the constrained value
      let outputValue: number;

      if (value === undefined) {
        outputValue = min;
      } else {
        // Round to nearest step
        const steps = Math.round((value - min) / step);
        outputValue = min + steps * step;
        // Constrain between min and max
        outputValue = Math.min(Math.max(outputValue, min), max);
      }

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
