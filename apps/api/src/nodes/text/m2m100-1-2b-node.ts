import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";
/**
 * Translation node implementation using m2m100-1.2b model
 */
export class M2m10012bNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "m2m100-1-2b",
    name: "M2M100 1.2B",
    type: "m2m100-1-2b",
    description: "Translates text between languages using M2M100 1.2B model",
    tags: ["Text", "AI"],
    icon: "sparkles",
    documentation:
      "This node translates text between languages using Meta's M2M100 1.2B model.",
    computeCost: 10,
    asTool: true,
    inputs: [
      {
        name: "text",
        type: "string",
        description: "The text to be translated",
        required: true,
      },
      {
        name: "sourceLang",
        type: "string",
        description:
          "The language code of the source text (e.g., 'en' for English)",
      },
      {
        name: "targetLang",
        type: "string",
        description:
          "The language code to translate the text into (e.g., 'es' for Spanish)",
        required: true,
      },
    ],
    outputs: [
      {
        name: "translatedText",
        type: "string",
        description: "The translated text in the target language",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { text, sourceLang = "en", targetLang } = context.inputs;

      if (!context.env?.AI) {
        return this.createErrorResult("AI service is not available");
      }

      const response = await context.env.AI.run(
        "@cf/meta/m2m100-1.2b",
        {
          text,
          source_lang: sourceLang,
          target_lang: targetLang,
        },
        context.env.AI_OPTIONS
      );

      // Extract the translated_text from the response
      const translatedText = (response as any).translated_text;

      if (!translatedText || typeof translatedText !== "string") {
        return this.createErrorResult(
          "Invalid response from translation model"
        );
      }

      return this.createSuccessResult({
        translatedText,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
