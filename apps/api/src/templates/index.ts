import type { WorkflowTemplate } from "@dafthunk/types";

import { shape3dTemplate } from "./3d-shape";
import { emailReplyTemplate } from "./email-reply";
import { imageGenerationTemplate } from "./image-generation";
import { textFormatterTemplate } from "./text-formatter";
import { textSentimentAnalysisTemplate } from "./text-sentiment-analysis";
import { textSummarizationTemplate } from "./text-summarization";
import { textTranslationTemplate } from "./text-translation";

export const workflowTemplates: WorkflowTemplate[] = [
  textSummarizationTemplate,
  imageGenerationTemplate,
  textSentimentAnalysisTemplate,
  textTranslationTemplate,
  textFormatterTemplate,
  emailReplyTemplate,
  shape3dTemplate,
];

export function getTemplateById(id: string): WorkflowTemplate | undefined {
  return workflowTemplates.find((t) => t.id === id);
}
