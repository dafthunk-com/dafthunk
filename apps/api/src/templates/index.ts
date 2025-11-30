import type { WorkflowTemplate } from "@dafthunk/types";

import { dataTransformationPipelineTemplate } from "./data-transformation-pipeline";
import { emailSentimentAnalysisTemplate } from "./email-sentiment-analysis";
import { imageGenerationTemplate } from "./image-generation";
import { textSummarizationTemplate } from "./text-summarization";
import { textTranslationTemplate } from "./text-translation";
import { websiteContentExtractionTemplate } from "./website-content-extraction";

export const workflowTemplates: WorkflowTemplate[] = [
  textSummarizationTemplate,
  websiteContentExtractionTemplate,
  imageGenerationTemplate,
  emailSentimentAnalysisTemplate,
  textTranslationTemplate,
  dataTransformationPipelineTemplate,
];

export function getTemplateById(id: string): WorkflowTemplate | undefined {
  return workflowTemplates.find((t) => t.id === id);
}
