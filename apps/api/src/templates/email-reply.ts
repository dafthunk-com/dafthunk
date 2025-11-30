import type { WorkflowTemplate } from "@dafthunk/types";

import { DatasetAiSearchNode } from "../nodes/dataset/dataset-ai-search-node";
import { ParseEmailNode } from "../nodes/email/parse-email-node";
import { ReceiveEmailNode } from "../nodes/email/receive-email-node";
import { SendEmailNode } from "../nodes/email/send-email-node";

export const emailReplyTemplate: WorkflowTemplate = {
  id: "email-reply",
  name: "Email Reply",
  description:
    "Receive emails, search a dataset using RAG, and auto-reply with the result",
  icon: "mail",
  type: "email_message",
  tags: ["email", "rag", "ai", "automation"],
  nodes: [
    ReceiveEmailNode.create({
      id: "receive-email",
      name: "Receive Email",
      position: { x: 180, y: 70 },
    }),
    ParseEmailNode.create({
      id: "parse-email",
      name: "Parse Email",
      position: { x: 470, y: 280 },
    }),
    DatasetAiSearchNode.create({
      id: "rag-search",
      name: "RAG Search",
      position: { x: 810, y: 360 },
      inputs: {
        datasetId: "",
        rewriteQuery: true,
        maxResults: 10,
        scoreThreshold: 0.3,
      },
    }),
    SendEmailNode.create({
      id: "send-reply",
      name: "Send Reply",
      position: { x: 1080, y: 120 },
    }),
  ],
  edges: [
    {
      source: "receive-email",
      target: "parse-email",
      sourceOutput: "raw",
      targetInput: "raw",
    },
    {
      source: "receive-email",
      target: "send-reply",
      sourceOutput: "from",
      targetInput: "to",
    },
    {
      source: "parse-email",
      target: "rag-search",
      sourceOutput: "text",
      targetInput: "query",
    },
    {
      source: "parse-email",
      target: "send-reply",
      sourceOutput: "subject",
      targetInput: "subject",
    },
    {
      source: "rag-search",
      target: "send-reply",
      sourceOutput: "response",
      targetInput: "text",
    },
  ],
};
