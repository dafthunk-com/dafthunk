import { NodeExecution, NodeType } from "@dafthunk/types";

import { NodeContext } from "../types";
import { ExecutableNode } from "../types";

/**
 * Text-to-Speech node implementation using MeloTTS
 */
export class MelottsNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "melotts",
    name: "Text to Speech (MeloTTS)",
    type: "melotts",
    description: "Converts text to natural-sounding speech using MeloTTS",
    tags: ["Audio", "AI"],
    icon: "mic",
    computeCost: 10,
    inputs: [
      {
        name: "prompt",
        type: "string",
        description: "The text to convert to speech",
        required: true,
      },
      {
        name: "lang",
        type: "string",
        description:
          "The speech language (e.g., 'en' for English, 'fr' for French)",
        value: "en",
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

      const { prompt, lang } = context.inputs;

      const params = {
        prompt,
        lang: lang || "en",
      };

      // Call Cloudflare AI MeloTTS model
      // Request raw binary response instead of JSON
      const response = await context.env.AI.run(
        "@cf/myshell-ai/melotts",
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
        throw new Error("Unexpected response format from MeloTTS API");
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
