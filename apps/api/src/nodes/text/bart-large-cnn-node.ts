import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";
/**
 * Summarization node implementation using bart-large-cnn model
 */
export class BartLargeCnnNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "bart-large-cnn",
    name: "BART Large CNN",
    type: "bart-large-cnn",
    description: "Summarizes text using BART-large-CNN model",
    tags: ["Text", "AI"],
    icon: "sparkles",
    documentation: `This node summarizes text using Facebook's BART-large-CNN model.

## Usage Example

- **Input inputText**: \`"The article discusses the latest developments in renewable energy technology, including solar panels, wind turbines, and battery storage systems. Researchers have made significant breakthroughs in efficiency and cost reduction."\`
- **Input maxLength**: \`1024\`
- **Output**: \`"Researchers have made significant breakthroughs in renewable energy technology, including solar panels, wind turbines, and battery storage systems."\``,
    computeCost: 10,
    asTool: true,
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

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { inputText, maxLength } = context.inputs;

      if (!context.env?.AI) {
        return this.createErrorResult("AI service is not available");
      }

      const result = await context.env.AI.run(
        "@cf/facebook/bart-large-cnn",
        {
          input_text: inputText,
          max_length: maxLength,
        },
        context.env.AI_OPTIONS
      );

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
