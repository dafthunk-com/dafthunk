import type { Edge, Node, WorkflowType } from "@dafthunk/types";

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category:
    | "text-processing"
    | "data-processing"
    | "communication"
    | "web-scraping"
    | "content-creation";
  type: WorkflowType;
  tags: string[];
  nodes: Node[];
  edges: Edge[];
}

export const workflowTemplates: WorkflowTemplate[] = [
  {
    id: "text-summarization",
    name: "Text Summarization",
    description: "Summarize long text content using AI",
    category: "text-processing",
    type: "manual",
    tags: ["ai", "text", "summarization"],
    nodes: [
      {
        id: "input-1",
        name: "Text Area",
        type: "text-area",
        description: "Enter text to summarize",
        position: { x: 100, y: 100 },
        inputs: [
          {
            name: "value",
            type: "string",
            value: "",
            hidden: true,
          },
          {
            name: "placeholder",
            type: "string",
            value: "Enter text to summarize...",
            hidden: true,
          },
          {
            name: "rows",
            type: "number",
            value: 6,
            hidden: true,
          },
        ],
        outputs: [
          {
            name: "value",
            type: "string",
          },
        ],
      },
      {
        id: "summarizer-1",
        name: "BART Large CNN",
        type: "bart-large-cnn",
        description: "AI summarization model",
        position: { x: 500, y: 100 },
        inputs: [
          {
            name: "inputText",
            type: "string",
            required: true,
          },
          {
            name: "maxLength",
            type: "number",
            value: 1024,
            hidden: true,
          },
        ],
        outputs: [
          {
            name: "summary",
            type: "string",
          },
        ],
      },
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
      {
        id: "url-input-1",
        name: "Form Data String",
        type: "form-data-string",
        description: "Enter website URL to scrape",
        position: { x: 100, y: 100 },
        inputs: [
          {
            name: "name",
            type: "string",
            value: "url",
            required: true,
          },
          {
            name: "required",
            type: "boolean",
            value: true,
          },
        ],
        outputs: [
          {
            name: "value",
            type: "string",
          },
        ],
      },
      {
        id: "browser-content-1",
        name: "Cloudflare Browser Content",
        type: "cloudflare-browser-content",
        description: "Extract website content",
        position: { x: 500, y: 100 },
        inputs: [
          {
            name: "url",
            type: "string",
            required: true,
          },
        ],
        outputs: [
          {
            name: "content",
            type: "string",
          },
        ],
      },
      {
        id: "to-markdown-1",
        name: "To Markdown",
        type: "to-markdown",
        description: "Convert content to markdown format",
        position: { x: 900, y: 100 },
        inputs: [
          {
            name: "html",
            type: "string",
            required: true,
          },
        ],
        outputs: [
          {
            name: "markdown",
            type: "string",
          },
        ],
      },
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
        sourceOutput: "content",
        targetInput: "html",
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
      {
        id: "prompt-input-1",
        name: "Text Area",
        type: "text-area",
        description: "Enter description for image generation",
        position: { x: 100, y: 100 },
        inputs: [
          {
            name: "value",
            type: "string",
            value: "",
            hidden: true,
          },
          {
            name: "placeholder",
            type: "string",
            value: "Enter your image prompt here...",
            hidden: true,
          },
          {
            name: "rows",
            type: "number",
            value: 4,
            hidden: true,
          },
        ],
        outputs: [
          {
            name: "value",
            type: "string",
          },
        ],
      },
      {
        id: "image-gen-1",
        name: "Stable Diffusion XL Lightning",
        type: "stable-diffusion-xl-lightning",
        description: "Generate image from prompt",
        position: { x: 500, y: 100 },
        inputs: [
          {
            name: "prompt",
            type: "string",
            required: true,
          },
        ],
        outputs: [
          {
            name: "image",
            type: "image",
          },
        ],
      },
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
      {
        id: "email-parameters-1",
        name: "Email Parameters",
        type: "email-parameters",
        description: "Extract email parameters from context",
        position: { x: 100, y: 100 },
        inputs: [],
        outputs: [
          {
            name: "from",
            type: "string",
          },
          {
            name: "to",
            type: "string",
          },
          {
            name: "headers",
            type: "json",
          },
          {
            name: "raw",
            type: "string",
          },
        ],
      },
      {
        id: "email-parser-1",
        name: "Email Parser",
        type: "email-parser",
        description: "Extract text from email",
        position: { x: 500, y: 100 },
        inputs: [
          {
            name: "rawEmail",
            type: "string",
            required: true,
          },
        ],
        outputs: [
          {
            name: "subject",
            type: "string",
          },
          {
            name: "text",
            type: "string",
          },
          {
            name: "html",
            type: "string",
          },
          {
            name: "from",
            type: "json",
          },
          {
            name: "to",
            type: "json",
          },
          {
            name: "cc",
            type: "json",
          },
          {
            name: "bcc",
            type: "json",
          },
          {
            name: "replyTo",
            type: "json",
          },
          {
            name: "date",
            type: "string",
          },
          {
            name: "messageId",
            type: "string",
          },
          {
            name: "inReplyTo",
            type: "string",
          },
          {
            name: "references",
            type: "json",
          },
          {
            name: "priority",
            type: "string",
          },
        ],
      },
      {
        id: "sentiment-1",
        name: "DistilBERT SST-2 Int8",
        type: "distilbert-sst-2-int8",
        description: "Analyze sentiment of email content",
        position: { x: 900, y: 100 },
        inputs: [
          {
            name: "text",
            type: "string",
            required: true,
          },
        ],
        outputs: [
          {
            name: "positive",
            description: "positive",
            type: "number",
          },
          {
            name: "negative",
            description: "negative",
            type: "number",
          },
        ],
      },
    ],
    edges: [
      {
        source: "email-parameters-1",
        target: "email-parser-1",
        sourceOutput: "raw",
        targetInput: "rawEmail",
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
      {
        id: "number-1",
        name: "Number Input",
        type: "number-input",
        description: "Enter first number",
        position: { x: 100, y: 100 },
        inputs: [
          {
            name: "value",
            type: "number",
            value: 0,
            hidden: true,
          },
          {
            name: "min",
            type: "number",
            value: undefined,
            hidden: true,
          },
          {
            name: "max",
            type: "number",
            value: undefined,
            hidden: true,
          },
          {
            name: "step",
            type: "number",
            value: undefined,
            hidden: true,
          },
          {
            name: "placeholder",
            type: "string",
            value: "Enter first number",
            hidden: true,
          },
        ],
        outputs: [
          {
            name: "value",
            type: "number",
          },
        ],
      },
      {
        id: "number-2",
        name: "Number Input",
        type: "number-input",
        description: "Enter second number",
        position: { x: 100, y: 300 },
        inputs: [
          {
            name: "value",
            type: "number",
            value: 0,
            hidden: true,
          },
          {
            name: "min",
            type: "number",
            value: undefined,
            hidden: true,
          },
          {
            name: "max",
            type: "number",
            value: undefined,
            hidden: true,
          },
          {
            name: "step",
            type: "number",
            value: undefined,
            hidden: true,
          },
          {
            name: "placeholder",
            type: "string",
            value: "Enter second number",
            hidden: true,
          },
        ],
        outputs: [
          {
            name: "value",
            type: "number",
          },
        ],
      },
      {
        id: "addition-1",
        name: "Addition",
        type: "addition",
        description: "Add the two numbers",
        position: { x: 500, y: 100 },
        inputs: [
          {
            name: "a",
            type: "number",
            required: true,
          },
          {
            name: "b",
            type: "number",
            required: true,
          },
        ],
        outputs: [
          {
            name: "result",
            type: "number",
          },
        ],
      },
      {
        id: "multiplication-1",
        name: "Multiplication",
        type: "multiplication",
        description: "Multiply the two numbers",
        position: { x: 500, y: 300 },
        inputs: [
          {
            name: "a",
            type: "number",
            required: true,
          },
          {
            name: "b",
            type: "number",
            required: true,
          },
        ],
        outputs: [
          {
            name: "result",
            type: "number",
          },
        ],
      },
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
      {
        id: "text-input-1",
        name: "Text Area",
        type: "text-area",
        description: "Enter text to translate",
        position: { x: 100, y: 100 },
        inputs: [
          {
            name: "value",
            type: "string",
            value: "",
            hidden: true,
          },
          {
            name: "placeholder",
            type: "string",
            value: "Enter text to translate...",
            hidden: true,
          },
          {
            name: "rows",
            type: "number",
            value: 4,
            hidden: true,
          },
        ],
        outputs: [
          {
            name: "value",
            type: "string",
          },
        ],
      },
      {
        id: "translation-1",
        name: "M2M100 1-2B",
        type: "m2m100-1-2b",
        description: "Multilingual translation model",
        position: { x: 500, y: 100 },
        inputs: [
          {
            name: "text",
            type: "string",
            required: true,
          },
          {
            name: "sourceLang",
            type: "string",
            value: "en",
            description: "Source language code (e.g., 'en' for English)",
          },
          {
            name: "targetLang",
            type: "string",
            value: "es",
            required: true,
            description: "Target language code (e.g., 'es' for Spanish)",
          },
        ],
        outputs: [
          {
            name: "translatedText",
            type: "string",
          },
        ],
      },
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
      {
        id: "input-data-1",
        name: "Text Area",
        type: "text-area",
        description: "Enter raw data to process",
        position: { x: 100, y: 100 },
        inputs: [
          {
            name: "value",
            type: "string",
            value: "",
            hidden: true,
          },
          {
            name: "placeholder",
            type: "string",
            value: "Enter your data here...",
            hidden: true,
          },
          {
            name: "rows",
            type: "number",
            value: 6,
            hidden: true,
          },
        ],
        outputs: [
          {
            name: "value",
            type: "string",
          },
        ],
      },
      {
        id: "template-1",
        name: "Single Variable String Template",
        type: "single-variable-string-template",
        description: "Format the processed data",
        position: { x: 500, y: 100 },
        inputs: [
          {
            name: "template",
            type: "string",
            value: "Processed Data: ${variable}",
          },
          {
            name: "variable",
            type: "string",
            required: true,
          },
        ],
        outputs: [
          {
            name: "result",
            type: "string",
          },
        ],
      },
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
