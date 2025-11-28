import type { WorkflowTemplate } from "@dafthunk/types";

import { ParseEmailNode } from "../nodes/email/parse-email-node";
import { ReceiveEmailNode } from "../nodes/email/receive-email-node";
import { DistilbertSst2Int8Node } from "../nodes/text/distilbert-sst-2-int8-node";

export const emailSentimentAnalysisTemplate: WorkflowTemplate = {
  id: "email-sentiment-analysis",
  name: "Email Sentiment Analysis",
  description: "Analyze the sentiment of incoming emails",
  category: "communication",
  type: "email_message",
  tags: ["email", "sentiment", "ai", "analysis"],
  nodes: [
    ReceiveEmailNode.create({
      id: "email-parameters-1",
      position: { x: 100, y: 100 },
      description: "Extract email parameters from context",
    }),
    ParseEmailNode.create({
      id: "email-parser-1",
      position: { x: 500, y: 100 },
      description: "Extract text from email",
    }),
    DistilbertSst2Int8Node.create({
      id: "sentiment-1",
      position: { x: 900, y: 100 },
      description: "Analyze sentiment of email content",
    }),
  ],
  edges: [
    {
      source: "email-parameters-1",
      target: "email-parser-1",
      sourceOutput: "raw",
      targetInput: "raw",
    },
    {
      source: "email-parser-1",
      target: "sentiment-1",
      sourceOutput: "text",
      targetInput: "text",
    },
  ],
};
