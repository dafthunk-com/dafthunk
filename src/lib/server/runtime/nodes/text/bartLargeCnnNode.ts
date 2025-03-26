import { BaseExecutableNode } from "../baseNode";
import { NodeContext, ExecutionResult, NodeType } from "../../workflowTypes";

/**
 * Summarization node implementation using bart-large-cnn model
 */
export class BartLargeCnnNode extends BaseExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "bart-large-cnn",
    name: "BART Large CNN",
    type: "bart-large-cnn",
    description: "Summarizes text using BART-large-CNN model",
    category: "Text",
    icon: "summarize",
    inputs: [
      {
        name: "inputText",
        type: "string",
        description: "The text that you want the model to summarize",
        required: true,
      },
      {
        name: "maxLength",
        type: "number",
        description: "The maximum length of the generated summary in tokens",
        value: 1024,
        hidden: true,
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
      const { inputText, maxLength } = context.inputs;

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
