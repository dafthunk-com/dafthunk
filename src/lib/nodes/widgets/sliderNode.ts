import { BaseExecutableNode } from "../baseNode";
import { ExecutionResult } from "../../workflowModel";
import { NodeContext } from "@lib/workflowRuntime";

/**
 * Slider node implementation
 * This node provides a slider widget that outputs a selected value
 * constrained by min, max, and step values.
 *
 * The slider's current value is stored as an input parameter named "value"
 * and passed directly to the output.
 */
export class SliderNode extends BaseExecutableNode {
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
