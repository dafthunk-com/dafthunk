import { BaseExecutableNode } from "../baseNode";
import { ExecutionResult, NodeContext, NodeType } from "../../workflowTypes";

/**
 * Translation node implementation
 */
export class TranslationNode extends BaseExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "translation",
    name: "Translation",
    type: "translation",
    description: "Translates text between languages",
    category: "Text",
    icon: "language",
    inputs: [
      {
        name: "text",
        type: "string",
        description: "The text to be translated",
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

  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const text = context.inputs.text;
      const sourceLang = context.inputs.sourceLang || "en";
      const targetLang = context.inputs.targetLang;

      if (!text || typeof text !== "string") {
        return this.createErrorResult("Text is required and must be a string");
      }

      if (!targetLang || typeof targetLang !== "string") {
        return this.createErrorResult(
          "Target language is required and must be a string"
        );
      }

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
