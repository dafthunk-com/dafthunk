import type { WorkflowTrigger } from "@dafthunk/types";

/**
 * One request per shipped template, phrased the way a user would.
 *
 * The templates are the only hand-verified graphs in the codebase, so they make
 * a fair yardstick: if the generator can reach something equivalent from a
 * plain sentence, it can handle the shape of work people actually ask for.
 *
 * `expectTrigger` is asserted; node choice deliberately is not. There are many
 * valid graphs for each of these, and pinning the exact nodes would measure
 * imitation rather than correctness.
 */
export interface BenchmarkCase {
  templateId: string;
  prompt: string;
  expectTrigger: WorkflowTrigger;
}

export const BENCHMARK_CASES: BenchmarkCase[] = [
  {
    templateId: "text-summarization",
    prompt: "Summarize a long piece of text with AI and show me the summary",
    expectTrigger: "manual",
  },
  {
    templateId: "sentiment-analysis",
    prompt: "Tell me whether a piece of text is positive or negative",
    expectTrigger: "manual",
  },
  {
    templateId: "text-translation",
    prompt: "Translate some text from English into French",
    expectTrigger: "manual",
  },
  {
    templateId: "text-formatter",
    prompt: "Fill a greeting template with a name and a city",
    expectTrigger: "manual",
  },
  {
    templateId: "image-generation",
    prompt: "Generate an image from a text description",
    expectTrigger: "manual",
  },
  {
    templateId: "image-description",
    prompt: "Take an image and describe what is in it",
    expectTrigger: "manual",
  },
  {
    templateId: "speech-to-text",
    prompt: "Transcribe an audio recording into text",
    expectTrigger: "manual",
  },
  {
    templateId: "text-to-speech",
    prompt: "Turn a sentence into spoken audio",
    expectTrigger: "manual",
  },
  {
    templateId: "outline-and-write",
    prompt:
      "Write an article in two steps: first an outline, then the full article from that outline",
    expectTrigger: "manual",
  },
  {
    templateId: "parallel-article-card",
    prompt:
      "For one article, produce a summary, a list of keywords and a title, then combine them into a single card",
    expectTrigger: "manual",
  },
  {
    templateId: "support-routing",
    prompt:
      "Classify a support message and route it down a different branch depending on the category, then merge the branches",
    expectTrigger: "manual",
  },
  {
    templateId: "conditional-branching",
    prompt:
      "Take a number and follow one branch if it is above a threshold and another if it is below, then join them",
    expectTrigger: "manual",
  },
  {
    templateId: "ai-calculator",
    prompt: "Answer a maths question using AI",
    expectTrigger: "manual",
  },
  {
    templateId: "wiki-research-agent",
    prompt: "Answer a factual question by looking things up on Wikipedia",
    expectTrigger: "manual",
  },
  {
    templateId: "web-screenshot",
    prompt: "Take a screenshot of a web page",
    expectTrigger: "manual",
  },
  {
    templateId: "image-processing",
    prompt: "Apply a colour effect to a photo",
    expectTrigger: "manual",
  },
  {
    templateId: "3d-shape",
    prompt: "Build a 3D shape by subtracting a sphere from a cube",
    expectTrigger: "manual",
  },
  {
    templateId: "http-echo",
    prompt:
      "An HTTP endpoint that echoes the request body back in the response",
    expectTrigger: "http_request",
  },
  {
    templateId: "image-to-text",
    prompt:
      "An HTTP endpoint that takes an image, extracts the text in it and returns it as speech",
    expectTrigger: "http_request",
  },
  {
    templateId: "email-reply",
    prompt: "When an email arrives, write a reply with AI and send it back",
    expectTrigger: "email_message",
  },
  {
    templateId: "discord-bot",
    prompt: "Reply to Discord messages using AI",
    expectTrigger: "discord_event",
  },
  {
    templateId: "telegram-bot",
    prompt: "Reply to Telegram messages using AI",
    expectTrigger: "telegram_event",
  },
  {
    templateId: "whatsapp-bot",
    prompt: "Reply to WhatsApp messages using AI",
    expectTrigger: "whatsapp_event",
  },
];
