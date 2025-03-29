import { NodeContext, ExecutionResult } from "../../runtime/types";
import { ExecutableNode } from "../types";
import {
  ArrayParameter,
  AudioParameter,
  BooleanParameter,
  JsonParameter,
  NumberParameter,
} from "../types";
import { StringParameter } from "../types";
import { NodeType } from "../types";

/**
 * Speech Recognition node implementation using Whisper Large V3 Turbo
 */
export class WhisperLargeV3TurboNode extends ExecutableNode {
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
        type: AudioParameter,
        description: "The audio file to transcribe",
        required: true,
      },
      {
        name: "task",
        type: StringParameter,
        description: "The task to perform: 'transcribe' or 'translate'",
      },
      {
        name: "language",
        type: StringParameter,
        description: "The language of the audio (e.g., 'en', 'fr', 'es')",
      },
      {
        name: "vad_filter",
        type: BooleanParameter,
        description: "Whether to use voice activity detection",
        hidden: true,
      },
      {
        name: "initial_prompt",
        type: StringParameter,
        description: "Optional text prompt to guide the transcription",
        hidden: true,
      },
      {
        name: "prefix",
        type: StringParameter,
        description:
          "Optional prefix to append to the beginning of the transcription",
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "text",
        type: StringParameter,
        description: "The transcribed text",
      },
      {
        name: "word_count",
        type: NumberParameter,
        description: "The number of words in the transcription",
        hidden: true,
      },
      {
        name: "segments",
        type: ArrayParameter,
        description: "Detailed transcription segments with timing information",
        hidden: true,
      },
      {
        name: "vtt",
        type: StringParameter,
        description: "WebVTT format of the transcription",
        hidden: true,
      },
      {
        name: "transcription_info",
        type: JsonParameter,
        description: "Additional information about the transcription",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      if (!context.env?.AI) {
        throw new Error("AI service is not available");
      }

      const { audio, task, language, vad_filter, initial_prompt, prefix } =
        context.inputs;

      // Prepare the request parameters
      const params: Record<string, any> = {
        audio: Array.from(audio.data),
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
        params
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
        text: new StringParameter(output.text),
        word_count: new NumberParameter(output.word_count),
        segments: new ArrayParameter(output.segments),
        vtt: new StringParameter(output.vtt),
        transcription_info: new JsonParameter(output.transcription_info),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
