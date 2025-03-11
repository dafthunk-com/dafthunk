import { BaseExecutableNode } from "../baseNode";
import { ExecutionResult } from "../../workflowModel.ts";
import { NodeContext } from "@lib/workflowRuntime.ts";

/**
 * Summarization node implementation using bart-large-cnn model
 */
export class SummarizationNode extends BaseExecutableNode {
  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const inputText = context.inputs.inputText;
      const maxLength = context.inputs.maxLength;

      if (!inputText || typeof inputText !== "string") {
        return this.createErrorResult(
          "Input text is required and must be a string"
        );
      }

      if (!context.env?.AI) {
        return this.createErrorResult("AI service is not available");
      }

      const result = await context.env.AI.run("@cf/facebook/bart-large-cnn", {
        input_text: inputText,
        max_length: maxLength,
      });

      return this.createSuccessResult({
        summary: result.summary,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
