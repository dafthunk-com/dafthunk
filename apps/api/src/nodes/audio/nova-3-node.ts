import { NodeExecution, NodeType } from "@dafthunk/types";

import { NodeContext } from "../types";
import { ExecutableNode } from "../types";

/**
 * Speech Recognition node implementation using Nova-3
 */
export class Nova3Node extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "nova-3",
    name: "Speech Recognition (Nova-3)",
    type: "nova-3",
    description:
      "Transcribes speech from audio files using Deepgram's Nova-3 model with advanced features",
    tags: ["Audio", "TTS", "Deepgram", "Nova"],
    icon: "mic",
    documentation:
      "This node transcribes speech from audio files using Deepgram's Nova-3 model, providing high-quality speech-to-text conversion with advanced features like speaker diarization, sentiment analysis, and topic detection.",
    referenceUrl: "https://developers.cloudflare.com/workers-ai/models/nova-3/",
    computeCost: 5,
    inputs: [
      {
        name: "audio",
        type: "audio",
        description: "The audio file to transcribe",
        required: true,
      },
      {
        name: "detect_language",
        type: "boolean",
        description:
          "Identifies the dominant language spoken in submitted audio",
        value: true,
      },
      {
        name: "diarize",
        type: "boolean",
        description:
          "Recognize speaker changes. Each word will be assigned a speaker number",
        value: false,
      },
      {
        name: "sentiment",
        type: "boolean",
        description: "Recognizes the sentiment throughout a transcript",
        value: false,
      },
      {
        name: "topics",
        type: "boolean",
        description: "Detect topics throughout a transcript",
        value: false,
      },
      {
        name: "detect_entities",
        type: "boolean",
        description: "Identifies and extracts key entities from content",
        value: false,
      },
      {
        name: "smart_format",
        type: "boolean",
        description:
          "Apply formatting to transcript output for improved readability",
        value: true,
      },
      {
        name: "punctuate",
        type: "boolean",
        description: "Add punctuation and capitalization to the transcript",
        value: true,
      },
      {
        name: "paragraphs",
        type: "boolean",
        description:
          "Splits audio into paragraphs to improve transcript readability",
        value: false,
      },
      {
        name: "utterances",
        type: "boolean",
        description: "Segments speech into meaningful semantic units",
        value: false,
      },
      {
        name: "filler_words",
        type: "boolean",
        description: "Include filler words like 'uh' and 'um' in transcription",
        value: false,
      },
      {
        name: "profanity_filter",
        type: "boolean",
        description: "Filter or replace profanity in the transcript",
        value: false,
      },
      {
        name: "numerals",
        type: "boolean",
        description: "Convert numbers from written format to numerical format",
        value: false,
      },
      {
        name: "measurements",
        type: "boolean",
        description:
          "Convert spoken measurements to their corresponding abbreviations",
        value: false,
      },
      {
        name: "language",
        type: "string",
        description:
          "The BCP-47 language tag that hints at the primary spoken language",
        value: "",
      },
      {
        name: "mode",
        type: "string",
        description:
          "Mode of operation for the model (general, medical, finance)",
        value: "general",
      },
      {
        name: "encoding",
        type: "string",
        description: "Specify the expected encoding of your submitted audio",
        value: "",
      },
      {
        name: "channels",
        type: "number",
        description: "The number of channels in the submitted audio",
        value: 1,
      },
      {
        name: "multichannel",
        type: "boolean",
        description: "Transcribe each audio channel independently",
        value: false,
      },
      {
        name: "keywords",
        type: "string",
        description:
          "Keywords to boost or suppress specialized terminology and brands",
        value: "",
      },
      {
        name: "custom_topic",
        type: "string",
        description: "Custom topics you want the model to detect (up to 100)",
        value: "",
      },
      {
        name: "custom_intent",
        type: "string",
        description: "Custom intents you want the model to detect",
        value: "",
      },
    ],
    outputs: [
      {
        name: "text",
        type: "string",
        description: "The transcribed text",
      },
      {
        name: "confidence",
        type: "number",
        description: "Confidence score of the transcription",
        hidden: true,
      },
      {
        name: "words",
        type: "json",
        description:
          "Detailed word timing information with speaker assignments",
        hidden: true,
      },
      {
        name: "sentiments",
        type: "json",
        description: "Sentiment analysis results if enabled",
        hidden: true,
      },
      {
        name: "summary",
        type: "json",
        description: "Summary of the transcript if available",
        hidden: true,
      },
      {
        name: "language",
        type: "string",
        description: "Detected language if language detection is enabled",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      if (!context.env?.AI) {
        throw new Error("AI service is not available");
      }

      const {
        audio,
        detect_language,
        diarize,
        sentiment,
        topics,
        detect_entities,
        smart_format,
        punctuate,
        paragraphs,
        utterances,
        filler_words,
        profanity_filter,
        numerals,
        measurements,
        language,
        mode,
        encoding,
        channels,
        multichannel,
        keywords,
        custom_topic,
        custom_intent,
      } = context.inputs;

      if (!audio) {
        throw new Error("Audio input is required");
      }

      // Build parameters object with only provided values
      // Nova-3 requires {body, contentType} format where body is a ReadableStream
      // Convert Uint8Array to ReadableStream
      const audioStream = new ReadableStream({
        start(controller) {
          controller.enqueue(audio.data);
          controller.close();
        },
      });

      const params: any = {
        audio: {
          body: audioStream,
          contentType: audio.mimeType || "audio/mpeg",
        },
      };

      // Add optional parameters only if they are provided and not default values
      if (detect_language !== undefined)
        params.detect_language = detect_language;
      if (diarize !== undefined) params.diarize = diarize;
      if (sentiment !== undefined) params.sentiment = sentiment;
      if (topics !== undefined) params.topics = topics;
      if (detect_entities !== undefined)
        params.detect_entities = detect_entities;
      if (smart_format !== undefined) params.smart_format = smart_format;
      if (punctuate !== undefined) params.punctuate = punctuate;
      if (paragraphs !== undefined) params.paragraphs = paragraphs;
      if (utterances !== undefined) params.utterances = utterances;
      if (filler_words !== undefined) params.filler_words = filler_words;
      if (profanity_filter !== undefined)
        params.profanity_filter = profanity_filter;
      if (numerals !== undefined) params.numerals = numerals;
      if (measurements !== undefined) params.measurements = measurements;
      if (language && language.trim()) params.language = language;
      if (mode && mode !== "general") params.mode = mode;
      if (encoding && encoding.trim()) params.encoding = encoding;
      if (channels && channels !== 1) params.channels = channels;
      if (multichannel !== undefined) params.multichannel = multichannel;
      if (keywords && keywords.trim()) params.keywords = keywords;
      if (custom_topic && custom_topic.trim())
        params.custom_topic = custom_topic;
      if (custom_intent && custom_intent.trim())
        params.custom_intent = custom_intent;

      // Call Cloudflare AI Nova-3 model
      const response = await context.env.AI.run(
        "@cf/deepgram/nova-3" as any,
        params,
        context.env.AI_OPTIONS
      );

      // Extract the results from the response
      const results = (response as any).results;
      if (!results || !results.channels || !results.channels[0]) {
        throw new Error("Invalid response format from Nova-3 API");
      }

      const channel = results.channels[0];
      const alternative = channel.alternatives?.[0];

      if (!alternative) {
        throw new Error("No transcription alternatives found in response");
      }

      // Build the output object
      const output: any = {
        text: alternative.transcript || "",
        confidence: alternative.confidence || 0,
        words: alternative.words || [],
      };

      // Add optional outputs if available
      if (results.summary) {
        output.summary = results.summary;
      }

      if (results.sentiments) {
        output.sentiments = results.sentiments;
      }

      // Extract language if detected
      if (detect_language && results.language) {
        output.language = results.language;
      }

      return this.createSuccessResult(output);
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
