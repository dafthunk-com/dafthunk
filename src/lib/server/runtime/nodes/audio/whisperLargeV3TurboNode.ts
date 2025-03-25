import { NodeContext, ExecutionResult, NodeType } from "../../workflowTypes";
import { BaseExecutableNode } from "../baseNode";

/**
 * Speech Recognition node implementation using Whisper Large V3 Turbo
 */
export class WhisperLargeV3TurboNode extends BaseExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "speech-recognition-large-v3-turbo",
    name: "Speech Recognition (Large V3 Turbo)",
    type: "speech-recognition-large-v3-turbo",
    description:
      "Transcribes speech from audio files using OpenAI's Whisper Large V3 Turbo model with enhanced performance",
    category: "Audio",
    icon: "mic",
    inputs: [
      {
        name: "audio",
        type: "audio",
        description: "The audio file to transcribe",
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
      },
      {
        name: "initial_prompt",
        type: "string",
        description: "Optional text prompt to guide the transcription",
      },
      {
        name: "prefix",
        type: "string",
        description: "Optional prefix to append to the beginning of the transcription",
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
      },
      {
        name: "segments",
        type: "array",
        description: "Detailed transcription segments with timing information",
      },
      {
        name: "vtt",
        type: "string",
        description: "WebVTT format of the transcription",
      },
      {
        name: "transcription_info",
        type: "json",
        description: "Additional information about the transcription",
      },
    ],
  };

  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      if (!context.env?.AI) {
        throw new Error("AI service is not available");
      }

      const { audio, task, language, vad_filter, initial_prompt, prefix } = context.inputs;

      // Validate required inputs
      if (!audio || !audio.data) {
        throw new Error("Audio input is required");
      }

      console.log(
        `Processing audio file for speech recognition with Whisper Large V3 Turbo, data length: ${audio.data.length} bytes`
      );

      // Prepare the audio data - convert back to Uint8Array
      const audioData = new Uint8Array(audio.data);

      // Prepare the request parameters
      const params: Record<string, any> = {
        audio: Array.from(audioData),
      };

      // Add optional parameters if provided
      if (task) params.task = task;
      if (language) params.language = language;
      if (vad_filter !== undefined) params.vad_filter = vad_filter;
      if (initial_prompt) params.initial_prompt = initial_prompt;
      if (prefix) params.prefix = prefix;

      // Call Cloudflare AI Whisper Large V3 Turbo model
      const response = await context.env.AI.run("@cf/openai/whisper-large-v3-turbo", params);

      console.log("Whisper Large V3 Turbo transcription response:", response);

      // Extract the results
      const { text, word_count, segments, vtt, transcription_info } = response;

      return this.createSuccessResult({
        text,
        word_count,
        segments,
        vtt,
        transcription_info,
      });
    } catch (error) {
      console.error("WhisperLargeV3TurboNode execution error:", error);
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
} 