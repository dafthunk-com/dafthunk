import type { Ai_Cf_Openai_Whisper_Large_V3_Turbo_Input } from "@cloudflare/workers-types/experimental";
import { NodeExecution, NodeType } from "@dafthunk/types";

import { NodeContext } from "../types";
import { ExecutableNode } from "../types";

/**
 * Speech Recognition node implementation using Whisper Large V3 Turbo
 */
export class WhisperLargeV3TurboNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "whisper-large-v3-turbo",
    name: "Speech Recognition (Whisper Large)",
    type: "whisper-large-v3-turbo",
    description:
      "Transcribes speech from audio files using OpenAI's Whisper Large V3 Turbo model with enhanced performance",
    tags: ["Audio", "AI"],
    icon: "mic",
    computeCost: 10,
    inputs: [
      {
        name: "audio",
        type: "audio",
        description: "The audio file to transcribe",
        required: true,
      },
      {
        name: "task",
        type: "string",
        description: "The task to perform: 'transcribe' or 'translate'",
      },
      {
        name: "language",
        type: "string",
        description: "The language of the audio (e.g., 'en', 'fr', 'es')",
      },
      {
        name: "vad_filter",
        type: "boolean",
        description: "Whether to use voice activity detection",
        hidden: true,
      },
      {
        name: "initial_prompt",
        type: "string",
        description: "Optional text prompt to guide the transcription",
        hidden: true,
      },
      {
        name: "prefix",
        type: "string",
        description:
          "Optional prefix to append to the beginning of the transcription",
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "text",
        type: "string",
        description: "The transcribed text",
      },
      {
        name: "word_count",
        type: "number",
        description: "The number of words in the transcription",
        hidden: true,
      },
      {
        name: "segments",
        type: "json",
        description: "Detailed transcription segments with timing information",
        hidden: true,
      },
      {
        name: "vtt",
        type: "string",
        description: "WebVTT format of the transcription",
        hidden: true,
      },
      {
        name: "transcription_info",
        type: "json",
        description: "Additional information about the transcription",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      if (!context.env?.AI) {
        throw new Error("AI service is not available");
      }

      const { audio, task, language, vad_filter, initial_prompt, prefix } =
        context.inputs;

      // Convert audio data to base64 string for Whisper Large V3 Turbo
      const audioBase64 = btoa(String.fromCharCode(...audio.data));

      // Prepare the request parameters
      const params: Ai_Cf_Openai_Whisper_Large_V3_Turbo_Input = {
        audio: audioBase64,
      };

      // Add optional parameters if provided
      if (task) params.task = task;
      if (language) params.language = language;
      if (vad_filter !== undefined) params.vad_filter = vad_filter;
      if (initial_prompt) params.initial_prompt = initial_prompt;
      if (prefix) params.prefix = prefix;

      // Call Cloudflare AI Whisper Large V3 Turbo model
      const response = await context.env.AI.run(
        "@cf/openai/whisper-large-v3-turbo",
        params,
        context.env.AI_OPTIONS
      );

      // Extract the results
      const output = {
        text: response.text,
        word_count: response.word_count,
        segments: response.segments,
        vtt: response.vtt,
        transcription_info: response.transcription_info,
      };

      return this.createSuccessResult({
        text: output.text,
        word_count: output.word_count,
        segments: output.segments,
        vtt: output.vtt,
        transcription_info: output.transcription_info,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
