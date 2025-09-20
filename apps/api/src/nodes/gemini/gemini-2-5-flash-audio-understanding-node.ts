import { NodeExecution, NodeType } from "@dafthunk/types";
import { GoogleGenAI } from "@google/genai";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * Gemini 2.5 Flash Audio Understanding node implementation using the Google GenAI SDK
 * Analyzes and understands audio content, providing transcription, description, and analysis
 */
export class Gemini25FlashAudioUnderstandingNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "gemini-2-5-flash-audio-understanding",
    name: "Gemini 2.5 Flash Audio Understanding",
    type: "gemini-2-5-flash-audio-understanding",
    description:
      "Analyzes and understands audio content with transcription, description, and analysis capabilities",
    tags: ["Audio", "AI"],
    icon: "headphones",
    documentation: `This node uses Google's Gemini 2.5 Flash model to analyze and understand audio content.

## Capabilities

- **Transcription**: Convert speech to text with high accuracy
- **Audio Description**: Describe, summarize, or answer questions about audio content
- **Segment Analysis**: Analyze specific segments of audio using timestamps
- **Multi-language Support**: Automatically detects and supports 24+ languages
- **Non-speech Understanding**: Understands sounds like birdsong, sirens, music, etc.

## Usage Examples

- **Transcription**: "Generate a transcript of the speech"
- **Description**: "Describe what's happening in this audio clip"
- **Question Answering**: "What is the main topic discussed in this audio?"
- **Segment Analysis**: "Provide a transcript from 02:30 to 03:29"

## Supported Audio Formats

- WAV, MP3, AIFF, AAC, OGG Vorbis, FLAC
- Maximum length: 9.5 hours per request
- Automatic downsampling to 16 Kbps, mono channel

## Best Practices

- Use specific prompts for better results: "Transcribe this audio" vs "What's in this audio?"
- Reference timestamps for segment analysis: "From 01:30 to 02:45"
- Keep prompts focused on the specific analysis you need`,
    computeCost: 15,
    asTool: true,
    inputs: [
      {
        name: "audio",
        type: "audio",
        description: "Audio file to analyze (WAV, MP3, AIFF, AAC, OGG, FLAC)",
        required: true,
      },
      {
        name: "prompt",
        type: "string",
        description:
          "Instructions for audio analysis (e.g., 'Transcribe this audio', 'Describe what you hear')",
        required: true,
        value: "Analyze this audio content",
      },
      {
        name: "thinking_budget",
        type: "number",
        description:
          "Thinking budget (0-1000). Higher values enable more reasoning but increase cost and latency",
        required: false,
        value: 100,
        hidden: true,
      },
      {
        name: "apiKey",
        type: "secret",
        description: "Gemini API key secret name",
        required: false,
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "text",
        type: "string",
        description:
          "Generated text response (transcription, description, or analysis)",
      },
      {
        name: "finish_reason",
        type: "string",
        description:
          "Reason why the generation finished (STOP, MAX_TOKENS, etc.)",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { apiKey, audio, prompt, thinking_budget } = context.inputs;

      // Use provided API key secret or fallback to environment variable
      const geminiApiKey =
        (apiKey && context.secrets?.[apiKey]) || context.env.GEMINI_API_KEY;

      if (!geminiApiKey) {
        return this.createErrorResult(
          "Gemini API key is required. Provide via apiKey input or GEMINI_API_KEY environment variable"
        );
      }

      if (!audio) {
        return this.createErrorResult("Audio input is required");
      }

      if (!prompt) {
        return this.createErrorResult("Prompt is required");
      }

      const ai = new GoogleGenAI({
        apiKey: geminiApiKey,
      });

      const config: any = {};

      // Configure thinking budget if provided
      if (thinking_budget !== undefined && thinking_budget !== null) {
        config.thinkingConfig = {
          thinkingBudget: thinking_budget,
        };
      }

      // Convert audio data to base64 safely
      const audioBase64 = Buffer.from(audio.data).toString("base64");

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: audio.mimeType,
                  data: audioBase64,
                },
              },
            ],
          },
        ],
        config,
      });

      // Extract response data
      if (!response?.candidates?.[0]?.content?.parts) {
        return this.createErrorResult("Invalid response from Gemini API");
      }

      const candidate = response.candidates[0];
      const content = candidate.content;
      if (!content?.parts) {
        return this.createErrorResult(
          "Invalid content structure from Gemini API"
        );
      }

      const textParts = content.parts
        .filter((part: any) => part?.text)
        .map((part: any) => part.text)
        .join("");

      if (!textParts) {
        return this.createErrorResult("No text generated in response");
      }

      return this.createSuccessResult({
        text: textParts,
        finish_reason: candidate.finishReason || "STOP",
      });
    } catch (error) {
      console.error("Gemini Audio Understanding error:", error);
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
