import { BaseExecutableNode } from "../baseNode";
import { ExecutionResult } from "../../workflowModel.ts";
import { NodeContext } from "@lib/workflowRuntime.ts";

export class TranslationNode extends BaseExecutableNode {
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
