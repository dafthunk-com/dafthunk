import type { WorkflowTemplate } from "@dafthunk/types";

import { shape3dTemplate } from "./3d-shape";
import { aiCalculatorTemplate } from "./ai-calculator";
import { coinFlipTemplate } from "./coin-flip";
import { emailReplyTemplate } from "./email-reply";
import { imageDescriptionTemplate } from "./image-description";
import { imageGenerationTemplate } from "./image-generation";
import { imageProcessingTemplate } from "./image-processing";
import { sentimentAnalysisTemplate } from "./sentiment-analysis";
import { speechToTextTemplate } from "./speech-to-text";
import { textFormatterTemplate } from "./text-formatter";
import { textSummarizationTemplate } from "./text-summarization";
import { textToSpeechTemplate } from "./text-to-speech";
import { textTranslationTemplate } from "./text-translation";
import { webScreenshotTemplate } from "./web-screenshot";

export const workflowTemplates: WorkflowTemplate[] = [
  textSummarizationTemplate,
  imageGenerationTemplate,
  sentimentAnalysisTemplate,
  textTranslationTemplate,
  textFormatterTemplate,
  emailReplyTemplate,
  shape3dTemplate,
  imageDescriptionTemplate,
  textToSpeechTemplate,
  speechToTextTemplate,
  imageProcessingTemplate,
  webScreenshotTemplate,
  aiCalculatorTemplate,
  coinFlipTemplate,
];

export function getTemplateById(id: string): WorkflowTemplate | undefined {
  return workflowTemplates.find((t) => t.id === id);
}
