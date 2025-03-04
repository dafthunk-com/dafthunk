import { BaseExecutableNode } from "../baseNode";
import { NodeContext, ExecutionResult } from "../../workflowTypes";

/**
 * Slider node implementation
 * This node provides a slider widget that outputs a selected value
 * constrained by min, max, and step values.
 */
export class SliderNode extends BaseExecutableNode {
  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const min = Number(context.inputs.min);
      const max = Number(context.inputs.max);
      const step = Number(context.inputs.step);
      const defaultValue = Number(context.inputs.defaultValue);

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

      // If default value is provided, use it as the output
      // Otherwise, use the min value
      const value = !isNaN(defaultValue) 
        ? Math.min(Math.max(defaultValue, min), max) 
        : min;

      return this.createSuccessResult({
        value
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
} 