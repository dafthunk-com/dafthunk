import type { WorkflowTemplate } from "@dafthunk/types";
import { Hono } from "hono";

import type { ApiContext } from "../context";
import { CloudflareBrowserContentNode } from "../nodes/browser/cloudflare-browser-content-node";
import { ToMarkdownNode } from "../nodes/document/to-markdown-node";
import { ParseEmailNode } from "../nodes/email/parse-email-node";
import { ReceiveEmailNode } from "../nodes/email/receive-email-node";
import { FormDataStringNode } from "../nodes/http/form-data-string-node";
import { StableDiffusionXLLightningNode } from "../nodes/image/stable-diffusion-xl-lightning-node";
import { AdditionNode } from "../nodes/math/addition-node";
import { MultiplicationNode } from "../nodes/math/multiplication-node";
import { NumberInputNode } from "../nodes/math/number-input-node";
import { BartLargeCnnNode } from "../nodes/text/bart-large-cnn-node";
import { DistilbertSst2Int8Node } from "../nodes/text/distilbert-sst-2-int8-node";
import { M2m10012bNode } from "../nodes/text/m2m100-1-2b-node";
import { SingleVariableStringTemplateNode } from "../nodes/text/single-variable-string-template-node";
import { TextAreaNode } from "../nodes/text/text-area-node";

const templates = new Hono<ApiContext>();

const workflowTemplates: WorkflowTemplate[] = [
  {
    id: "text-summarization",
    name: "Text Summarization",
    description: "Summarize long text content using AI",
    category: "text-processing",
    type: "manual",
    tags: ["ai", "text", "summarization"],
    nodes: [
      TextAreaNode.create({
        id: "input-1",
        position: { x: 100, y: 100 },
        description: "Enter text to summarize",
        inputs: { placeholder: "Enter text to summarize...", rows: 6 },
      }),
      BartLargeCnnNode.create({
        id: "summarizer-1",
        position: { x: 500, y: 100 },
        description: "AI summarization model",
      }),
    ],
    edges: [
      {
        source: "input-1",
        target: "summarizer-1",
        sourceOutput: "value",
        targetInput: "inputText",
      },
    ],
  },
  {
    id: "website-content-extraction",
    name: "Website Content Extraction",
    description: "Extract and convert website content to markdown",
    category: "web-scraping",
    type: "http_request",
    tags: ["web", "scraping", "markdown", "content"],
    nodes: [
      FormDataStringNode.create({
        id: "url-input-1",
        position: { x: 100, y: 100 },
        description: "Enter website URL to scrape",
        inputs: { name: "url", required: true },
      }),
      CloudflareBrowserContentNode.create({
        id: "browser-content-1",
        position: { x: 500, y: 100 },
        description: "Extract website content",
      }),
      ToMarkdownNode.create({
        id: "to-markdown-1",
        position: { x: 900, y: 100 },
        description: "Convert content to markdown format",
      }),
    ],
    edges: [
      {
        source: "url-input-1",
        target: "browser-content-1",
        sourceOutput: "value",
        targetInput: "url",
      },
      {
        source: "browser-content-1",
        target: "to-markdown-1",
        sourceOutput: "html",
        targetInput: "document",
      },
    ],
  },
  {
    id: "image-generation-with-prompt",
    name: "AI Image Generation",
    description: "Generate images from text prompts using Stable Diffusion",
    category: "content-creation",
    type: "manual",
    tags: ["ai", "image", "generation", "stable-diffusion"],
    nodes: [
      TextAreaNode.create({
        id: "prompt-input-1",
        position: { x: 100, y: 100 },
        description: "Enter description for image generation",
        inputs: { placeholder: "Enter your image prompt here...", rows: 4 },
      }),
      StableDiffusionXLLightningNode.create({
        id: "image-gen-1",
        position: { x: 500, y: 100 },
        description: "Generate image from prompt",
      }),
    ],
    edges: [
      {
        source: "prompt-input-1",
        target: "image-gen-1",
        sourceOutput: "value",
        targetInput: "prompt",
      },
    ],
  },
  {
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
  },
  {
    id: "mathematical-calculator",
    name: "Mathematical Calculator",
    description: "Perform mathematical operations with multiple inputs",
    category: "data-processing",
    type: "manual",
    tags: ["math", "calculation", "numbers"],
    nodes: [
      NumberInputNode.create({
        id: "number-1",
        position: { x: 100, y: 100 },
        description: "Enter first number",
        inputs: { placeholder: "Enter first number" },
      }),
      NumberInputNode.create({
        id: "number-2",
        position: { x: 100, y: 300 },
        description: "Enter second number",
        inputs: { placeholder: "Enter second number" },
      }),
      AdditionNode.create({
        id: "addition-1",
        position: { x: 500, y: 100 },
        description: "Add the two numbers",
      }),
      MultiplicationNode.create({
        id: "multiplication-1",
        position: { x: 500, y: 300 },
        description: "Multiply the two numbers",
      }),
    ],
    edges: [
      {
        source: "number-1",
        target: "addition-1",
        sourceOutput: "value",
        targetInput: "a",
      },
      {
        source: "number-2",
        target: "addition-1",
        sourceOutput: "value",
        targetInput: "b",
      },
      {
        source: "number-1",
        target: "multiplication-1",
        sourceOutput: "value",
        targetInput: "a",
      },
      {
        source: "number-2",
        target: "multiplication-1",
        sourceOutput: "value",
        targetInput: "b",
      },
    ],
  },
  {
    id: "text-translation",
    name: "Text Translation",
    description: "Translate text between different languages",
    category: "text-processing",
    type: "manual",
    tags: ["translation", "language", "ai", "text"],
    nodes: [
      TextAreaNode.create({
        id: "text-input-1",
        position: { x: 100, y: 100 },
        description: "Enter text to translate",
        inputs: { placeholder: "Enter text to translate...", rows: 4 },
      }),
      M2m10012bNode.create({
        id: "translation-1",
        position: { x: 500, y: 100 },
        description: "Multilingual translation model",
        inputs: { sourceLang: "en", targetLang: "es" },
      }),
    ],
    edges: [
      {
        source: "text-input-1",
        target: "translation-1",
        sourceOutput: "value",
        targetInput: "text",
      },
    ],
  },
  {
    id: "data-transformation-pipeline",
    name: "Data Transformation Pipeline",
    description: "Transform and process text data through multiple steps",
    category: "data-processing",
    type: "manual",
    tags: ["text", "transformation", "processing", "pipeline"],
    nodes: [
      TextAreaNode.create({
        id: "input-data-1",
        position: { x: 100, y: 100 },
        description: "Enter raw data to process",
        inputs: { placeholder: "Enter your data here...", rows: 6 },
      }),
      SingleVariableStringTemplateNode.create({
        id: "template-1",
        position: { x: 500, y: 100 },
        description: "Format the processed data",
        inputs: { template: "Processed Data: ${variable}" },
      }),
    ],
    edges: [
      {
        source: "input-data-1",
        target: "template-1",
        sourceOutput: "value",
        targetInput: "variable",
      },
    ],
  },
];

templates.get("/", (c) => {
  return c.json({ templates: workflowTemplates });
});

templates.get("/:id", (c) => {
  const id = c.req.param("id");
  const template = workflowTemplates.find((t) => t.id === id);

  if (!template) {
    return c.json({ error: "Template not found" }, 404);
  }

  return c.json(template);
});

export default templates;
