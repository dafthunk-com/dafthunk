import { ExecutableNode } from "../types";
import { NodeContext } from "../types";
import { NodeType, NodeExecution } from "@dafthunk/types";
/**
 * Translation node implementation using m2m100-1.2b model
 */
export class M2m10012bNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "m2m100-1.2b",
    name: "M2M100 1.2B",
    type: "m2m100-1.2b",
    description: "Translates text between languages using M2M100 1.2B model",
    category: "Text",
    icon: "language",
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

      const result = await context.env.AI.run("@cf/meta/m2m100-1.2b", {
        text,
        source_lang: sourceLang,
        target_lang: targetLang,
      });

      return this.createSuccessResult({
        translatedText: result.translated_text,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
