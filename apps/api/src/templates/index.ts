import type { WorkflowTemplate } from "@dafthunk/types";

import { textFormatterTemplate } from "./text-formatter";
import { textSentimentAnalysisTemplate } from "./text-sentiment-analysis";
import { imageGenerationTemplate } from "./image-generation";
import { textSummarizationTemplate } from "./text-summarization";
import { textTranslationTemplate } from "./text-translation";

export const workflowTemplates: WorkflowTemplate[] = [
  textSummarizationTemplate,
  imageGenerationTemplate,
  textSentimentAnalysisTemplate,
  textTranslationTemplate,
  textFormatterTemplate,
];

export function getTemplateById(id: string): WorkflowTemplate | undefined {
  return workflowTemplates.find((t) => t.id === id);
}
