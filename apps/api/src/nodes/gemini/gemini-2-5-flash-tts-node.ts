import { NodeExecution, NodeType } from "@dafthunk/types";
import { GoogleGenAI } from "@google/genai";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * Convert PCM audio data to WAV format
 * Based on Gemini TTS documentation: PCM data is 16-bit signed little-endian, 24kHz, mono
 */
function convertPcmToWav(pcmData: Uint8Array): Uint8Array {
  // WAV file parameters based on Gemini TTS documentation
  const sampleRate = 24000; // 24kHz
  const channels = 1; // mono
  const bitsPerSample = 16; // 16-bit
  const bytesPerSample = bitsPerSample / 8;

  // Calculate data size
  const dataSize = pcmData.length;
  const fileSize = 36 + dataSize; // WAV header (44 bytes) - 8 bytes for RIFF header

  // Create WAV header
  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  // RIFF header
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, fileSize, true); // File size
  view.setUint32(8, 0x57415645, false); // "WAVE"

  // fmt chunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // Audio format (PCM)
  view.setUint16(22, channels, true); // Number of channels
  view.setUint32(24, sampleRate, true); // Sample rate
  view.setUint32(28, sampleRate * channels * bytesPerSample, true); // Byte rate
  view.setUint16(32, channels * bytesPerSample, true); // Block align
  view.setUint16(34, bitsPerSample, true); // Bits per sample

  // data chunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataSize, true); // Data size

  // Combine header and PCM data
  const wavData = new Uint8Array(44 + dataSize);
  wavData.set(new Uint8Array(header), 0);
  wavData.set(pcmData, 44);

  return wavData;
}

/**
 * Gemini 2.5 Flash TTS node implementation using the Google GenAI SDK
 * Generates speech from text with support for single and multi-speaker audio
 */
export class Gemini25FlashTtsNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "gemini-2-5-flash-tts",
    name: "Gemini 2.5 Flash TTS",
    type: "gemini-2-5-flash-tts",
    description:
      "Generates speech from text with support for single and multi-speaker audio",
    tags: ["AI", "TTS", "Google", "Gemini"],
    icon: "volume-2",
    documentation:
      "This node uses Google's Gemini 2.5 Flash Preview TTS model to generate speech from text.",
    usage: 20,
    inputs: [
      {
        name: "integrationId",
        type: "string",
        description: "Gemini integration to use",
        hidden: true,
        required: false,
      },
      {
        name: "text",
        type: "string",
        description:
          "Text to convert to speech (supports natural language style instructions)",
        required: true,
      },
      {
        name: "voice_name",
        type: "string",
        description:
          "Voice name for single speaker (e.g., 'Kore', 'Puck', 'Zephyr')",
        required: false,
        value: "Kore",
      },
      {
        name: "multi_speaker_config",
        type: "json",
        description:
          "Multi-speaker configuration with speaker names and voice assignments",
        required: false,
        hidden: true,
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
    ],
    outputs: [
      {
        name: "audio",
        type: "audio",
        description: "Generated audio from Gemini 2.5 Flash TTS",
      },
      {
        name: "usage_metadata",
        type: "json",
        description: "Token usage and cost information",
        hidden: true,
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
    let ai: any;
    let response: any;

    try {
      const {
        integrationId,
        text,
        voice_name,
        multi_speaker_config,
        thinking_budget,
      } = context.inputs;

      // Get API key from integration
      let geminiApiKey: string | undefined;

      if (integrationId && typeof integrationId === "string") {
        try {
          const integration = await context.getIntegration(integrationId);
          if (integration.provider === "gemini") {
            geminiApiKey = integration.token;
          }
        } catch {
          // Integration not found, will fall back to env vars or error below
        }
      }

      if (!geminiApiKey) {
        return this.createErrorResult(
          "Gemini integration is required. Please connect a Gemini integration."
        );
      }

      if (!text) {
        return this.createErrorResult("Text is required");
      }

      ai = new GoogleGenAI({
        apiKey: geminiApiKey,
      });

      const config: any = {
        responseModalities: ["AUDIO"],
      };

      // Configure thinking budget if provided
      if (thinking_budget !== undefined && thinking_budget !== null) {
        config.thinkingConfig = {
          thinkingBudget: thinking_budget,
        };
      }

      // Configure speech settings
      if (multi_speaker_config && multi_speaker_config.speakers) {
        // Multi-speaker configuration
        config.speechConfig = {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: multi_speaker_config.speakers.map(
              (speaker: any) => ({
                speaker: speaker.name,
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: speaker.voice,
                  },
                },
              })
            ),
          },
        };
      } else {
        // Single speaker configuration
        config.speechConfig = {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voice_name || "Kore",
            },
          },
        };
      }

      response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config,
      });

      // Extract all needed data immediately to avoid circular references
      let audioData: Uint8Array | null = null;
      let usageMetadata: any = null;
      let finishReason: string | null = null;
      let hasError = false;
      let errorMessage = "";

      try {
        // Process the response to find generated audio
        if (!response?.candidates?.[0]?.content?.parts) {
          hasError = true;
          errorMessage = "No response generated from Gemini API";
        } else {
          const candidate = response.candidates[0];
          const content = candidate.content;

          if (!content?.parts) {
            hasError = true;
            errorMessage = "Invalid response structure from Gemini API";
          } else {
            // Look for generated audio in response
            for (const part of content.parts) {
              if (part?.inlineData?.data) {
                console.log(
                  `Found generated audio: mimeType=${part.inlineData.mimeType}, dataLength=${part.inlineData.data.length}`
                );

                // Convert base64 data to Uint8Array for proper object store handling
                const binaryData = Uint8Array.from(
                  atob(part.inlineData.data),
                  (c) => c.charCodeAt(0)
                );

                // Convert PCM data to WAV format
                audioData = convertPcmToWav(binaryData);
                break;
              }
            }

            if (!audioData) {
              hasError = true;
              errorMessage = "No audio generated in response";
            } else {
              // Extract metadata safely
              usageMetadata = response.usageMetadata
                ? {
                    promptTokenCount: response.usageMetadata.promptTokenCount,
                    candidatesTokenCount:
                      response.usageMetadata.candidatesTokenCount,
                    totalTokenCount: response.usageMetadata.totalTokenCount,
                  }
                : null;

              finishReason = candidate.finishReason || null;
            }
          }
        }
      } catch (extractError) {
        hasError = true;
        errorMessage = "Error extracting response data";
        console.warn("Error extracting response data:", extractError);
      }

      // Dispose of response immediately after data extraction
      try {
        if (response && typeof (response as any).dispose === "function") {
          (response as any).dispose();
        }
        // Also try to dispose the models object
        if (ai.models && typeof (ai.models as any).dispose === "function") {
          (ai.models as any).dispose();
        }
        // And the client itself
        if (ai && typeof (ai as any).dispose === "function") {
          (ai as any).dispose();
        }
      } catch (disposeError) {
        console.warn("Failed to dispose response:", disposeError);
      }

      // Return result based on extracted data
      if (hasError) {
        return this.createErrorResult(errorMessage);
      }

      return this.createSuccessResult({
        audio: {
          data: audioData!,
          mimeType: "audio/wav",
        },
        ...(usageMetadata && { usage_metadata: usageMetadata }),
        ...(finishReason && { finish_reason: finishReason }),
      });
    } catch (error) {
      console.error("Gemini TTS error:", error);
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
