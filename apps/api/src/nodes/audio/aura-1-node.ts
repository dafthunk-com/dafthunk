import { NodeExecution, NodeType } from "@dafthunk/types";

import { NodeContext } from "../types";
import { ExecutableNode } from "../types";

/**
 * Text-to-Speech node implementation using Aura-1
 */
export class Aura1Node extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "aura-1",
    name: "Text to Speech (Aura-1)",
    type: "aura-1",
    description:
      "Converts text to natural-sounding speech using Aura-1 with context-aware pacing and expressiveness",
    tags: ["Audio", "TTS", "Deepgram", "Aura"],
    icon: "mic",
    documentation:
      "This node converts text to natural-sounding speech using the Aura-1 model from Deepgram. Aura-1 applies natural pacing, expressiveness, and fillers based on the context of the provided text.",
    referenceUrl: "https://developers.cloudflare.com/workers-ai/models/aura-1/",
    usage: 15,
    inputs: [
      {
        name: "text",
        type: "string",
        description: "The text content to be converted to speech",
        required: true,
      },
      {
        name: "speaker",
        type: "string",
        description: "Speaker used to produce the audio",
        value: "angus",
      },
      {
        name: "encoding",
        type: "string",
        description:
          "Encoding of the output audio (linear16, flac, mulaw, alaw, mp3, opus, aac)",
        value: "mp3",
      },
      {
        name: "container",
        type: "string",
        description:
          "Container specifies the file format wrapper for the output audio (none, wav, ogg)",
        value: "none",
      },
      {
        name: "sample_rate",
        type: "number",
        description:
          "Sample Rate specifies the sample rate for the output audio",
        value: 24000,
      },
      {
        name: "bit_rate",
        type: "number",
        description: "The bitrate of the audio in bits per second",
        value: 128000,
      },
    ],
    outputs: [
      {
        name: "audio",
        type: "audio",
        description: "The generated audio in MP3 format",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      if (!context.env?.AI) {
        throw new Error("AI service is not available");
      }

      const { text, speaker, encoding, container, sample_rate, bit_rate } =
        context.inputs;

      if (!text) {
        throw new Error("Text input is required");
      }

      // Start with minimal required parameters
      const params: any = {
        text,
      };

      // Only add optional parameters if they are provided and valid
      if (speaker) {
        params.speaker = speaker;
      }
      if (encoding) {
        params.encoding = encoding;
      }
      // Container parameter may not be compatible with certain encodings
      if (container && encoding && !["mp3", "opus", "aac"].includes(encoding)) {
        params.container = container;
      }

      // Sample rate and bit rate are only valid for certain encodings
      // According to the documentation, these parameters depend on the encoding type
      if (
        sample_rate &&
        encoding &&
        !["mp3", "opus", "aac"].includes(encoding)
      ) {
        params.sample_rate = sample_rate;
      }
      if (bit_rate && encoding && !["mp3", "opus", "aac"].includes(encoding)) {
        params.bit_rate = bit_rate;
      }

      // Call Cloudflare AI Aura-1 model
      const response = await context.env.AI.run(
        "@cf/deepgram/aura-1" as any,
        params,
        context.env.AI_OPTIONS
      );

      // Handle different response types from the API
      let audioBuffer;

      if (response instanceof ReadableStream) {
        const newResponse = new Response(response);
        const blob = await newResponse.blob();
        audioBuffer = await blob.arrayBuffer();
      } else if (response instanceof ArrayBuffer) {
        audioBuffer = response;
      } else if (
        response &&
        typeof response === "object" &&
        "audio" in response
      ) {
        // Handle case where API returns { audio: base64string }
        const audioBase64 = response.audio;
        if (typeof audioBase64 === "string") {
          // Convert base64 to array buffer
          const binaryString = atob(audioBase64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          audioBuffer = bytes.buffer;
        } else {
          throw new Error("Unexpected audio data format");
        }
      } else {
        throw new Error("Unexpected response format from Aura-1 API");
      }

      // Create properly structured audio output
      const audioOutput = {
        data: new Uint8Array(audioBuffer),
        mimeType: "audio/mpeg",
      };

      return this.createSuccessResult({
        audio: audioOutput,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
