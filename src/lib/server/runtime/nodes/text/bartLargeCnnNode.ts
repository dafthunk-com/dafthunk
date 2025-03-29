import { ExecutableNode } from "../nodeTypes";
import { NodeContext, ExecutionResult } from "../../types";
import { NodeType } from "../nodeTypes";
import { NumberNodeParameter, StringNodeParameter } from "../nodeTypes";
/**
 * Summarization node implementation using bart-large-cnn model
 */
export class BartLargeCnnNode extends ExecutableNode {
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
        type: StringNodeParameter,
        description: "The text that you want the model to summarize",
        required: true,
      },
      {
        name: "maxLength",
        type: NumberNodeParameter,
        description: "The maximum length of the generated summary in tokens",
        value: new NumberNodeParameter(1024),
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "summary",
        type: StringNodeParameter,
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
        summary: new StringNodeParameter(result.summary),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
