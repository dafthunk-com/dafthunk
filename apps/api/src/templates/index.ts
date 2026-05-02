import type { WorkflowTemplate } from "@dafthunk/types";

import { shape3dTemplate } from "./3d-shape";
import { aiCalculatorTemplate } from "./ai-calculator";
import { conditionalBranchingTemplate } from "./conditional-branching";
import { discordBotTemplate } from "./discord-bot";
import { emailReplyTemplate } from "./email-reply";
import { httpEchoTemplate } from "./http-echo";
import { imageDescriptionTemplate } from "./image-description";
import { imageGenerationTemplate } from "./image-generation";
import { imageProcessingTemplate } from "./image-processing";
import { imageToTextTemplate } from "./image-to-text";
import { outlineAndWriteTemplate } from "./outline-and-write";
import { parallelArticleCardTemplate } from "./parallel-article-card";
import { sentimentAnalysisTemplate } from "./sentiment-analysis";
import { speechToTextTemplate } from "./speech-to-text";
import { supportRoutingTemplate } from "./support-routing";
import { telegramBotTemplate } from "./telegram-bot";
import { textFormatterTemplate } from "./text-formatter";
import { textSummarizationTemplate } from "./text-summarization";
import { textToSpeechTemplate } from "./text-to-speech";
import { textTranslationTemplate } from "./text-translation";
import { webScreenshotTemplate } from "./web-screenshot";
import { whatsappBotTemplate } from "./whatsapp-bot";
import { wikiResearchAgentTemplate } from "./wiki-research-agent";

export const workflowTemplates: WorkflowTemplate[] = [
  textSummarizationTemplate,
  sentimentAnalysisTemplate,
  imageGenerationTemplate,
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
  outlineAndWriteTemplate,
  conditionalBranchingTemplate,
  supportRoutingTemplate,
  parallelArticleCardTemplate,
  wikiResearchAgentTemplate,
  httpEchoTemplate,
  imageToTextTemplate,
  discordBotTemplate,
  telegramBotTemplate,
  whatsappBotTemplate,
];

export function getTemplateById(id: string): WorkflowTemplate | undefined {
  return workflowTemplates.find((t) => t.id === id);
}
