import { BaseExecutableNode } from "../baseNode";
import { NodeContext, ExecutionResult, NodeType } from "../../workflowTypes";

/**
 * Summarization node implementation using bart-large-cnn model
 */
export class SummarizationNode extends BaseExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "summarization",
    name: "Summarization",
    type: "summarization",
    description: "Summarizes text using BART-large-CNN model",
    category: "AI",
    icon: "summarize",
    inputs: [
      {
        name: "inputText",
        type: "string",
        description: "The text that you want the model to summarize",
      },
      {
        name: "maxLength",
        type: "number",
        description: "The maximum length of the generated summary in tokens",
        value: 1024,
      },
    ],
    outputs: [
      {
        name: "summary",
        type: "string",
        description: "The summarized version of the input text",
      },
    ],
  };

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
