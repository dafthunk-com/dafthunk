import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { GoogleGenAI } from "@google/genai";
import { getGoogleAIConfig } from "../../utils/ai-gateway";
import { calculateTokenUsage, type TokenPricing } from "../../utils/usage";

// https://ai.google.dev/gemini-api/docs/pricing
// Gemini 2.5 Flash TTS: $0.50/MTok input (text), $10.00/MTok output (audio)
const PRICING: TokenPricing = {
  inputCostPerMillion: 0.5,
  outputCostPerMillion: 10.0,
};

const VALID_VOICES = [
  "Zephyr",
  "Puck",
  "Charon",
  "Kore",
  "Fenrir",
  "Leda",
  "Orus",
  "Aoede",
  "Callirrhoe",
  "Autonoe",
  "Enceladus",
  "Iapetus",
  "Umbriel",
  "Algieba",
  "Despina",
  "Erinome",
  "Algenib",
  "Rasalgethi",
  "Laomedeia",
  "Achernar",
  "Alnilam",
  "Schedar",
  "Gacrux",
  "Pulcherrima",
  "Achird",
  "Zubenelgenubi",
  "Vindemiatrix",
  "Sadachbia",
  "Sadaltager",
  "Sulafat",
] as const;

const VALID_VOICE_SET = new Set<string>(VALID_VOICES);

/**
 * Writes a 4-character ASCII string into a DataView at the given offset.
 */
function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Wraps raw PCM audio data in a WAV container (RIFF header + fmt + data chunks).
 * Gemini TTS outputs 24kHz, 16-bit, mono PCM -- this makes it playable.
 */
function wrapPcmAsWav(
  pcmData: Uint8Array,
  sampleRate = 24000,
  channels = 1,
  bitsPerSample = 16,
): Uint8Array {
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  const headerSize = 44;
  const buffer = new ArrayBuffer(headerSize + pcmData.length);
  const view = new DataView(buffer);
  const result = new Uint8Array(buffer);

  // RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, headerSize + pcmData.length - 8, true);
  writeString(view, 8, "WAVE");

  // fmt chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data chunk
  writeString(view, 36, "data");
  view.setUint32(40, pcmData.length, true);
  result.set(pcmData, headerSize);

  return result;
}

/**
 * Gemini 2.5 Flash TTS node -- converts text to speech using Google's Gemini TTS model.
 * Supports 30 prebuilt voices and 24kHz 16-bit mono PCM output wrapped as WAV.
 */
export class Gemini25FlashTtsNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "gemini-2-5-flash-tts",
    name: "Gemini 2.5 Flash TTS",
    type: "gemini-2-5-flash-tts",
    description:
      "Converts text to natural-sounding speech using Gemini 2.5 Flash",
    tags: ["AI", "Audio", "TTS", "Google", "Gemini"],
    icon: "mic",
    documentation:
      "This node converts text to speech using Google's Gemini 2.5 Flash TTS model, supporting 30 voices and 99+ languages with controllable style via natural language prompts.",
    referenceUrl: "https://ai.google.dev/gemini-api/docs/speech-generation",
    inlinable: false,
    asTool: false,
    usage: 1,
    inputs: [
      {
        name: "text",
        type: "string",
        description:
          "The text to convert to speech. You can include style directions like tone, pace, and emotion.",
        required: true,
      },
      {
        name: "voice",
        type: "string",
        description:
          "Voice name (Zephyr, Puck, Charon, Kore, Fenrir, Leda, Orus, Aoede, Callirrhoe, Autonoe, Enceladus, Iapetus, Umbriel, Algieba, Despina, Erinome, Algenib, Rasalgethi, Laomedeia, Achernar, Alnilam, Schedar, Gacrux, Pulcherrima, Achird, Zubenelgenubi, Vindemiatrix, Sadachbia, Sadaltager, Sulafat)",
        value: "Kore",
      },
    ],
    outputs: [
      {
        name: "audio",
        type: "audio",
        description: "Generated audio in WAV format (24kHz, 16-bit, mono)",
      },
      {
        name: "usage_metadata",
        type: "json",
        description: "Token usage and cost information",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { text, voice } = context.inputs;

      if (!text || typeof text !== "string") {
        return this.createErrorResult("Text input is required");
      }

      const voiceName = (voice as string) || "Kore";
      if (!VALID_VOICE_SET.has(voiceName)) {
        return this.createErrorResult(
          `Invalid voice "${voiceName}". Valid voices: ${VALID_VOICES.join(", ")}`,
        );
      }

      // API key is injected by AI Gateway via BYOK (Bring Your Own Keys)
      const ai = new GoogleGenAI({
        apiKey: "gateway-managed",
        ...getGoogleAIConfig(context.env),
      });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName,
              },
            },
          },
        },
      });

      if (!response?.candidates?.[0]?.content?.parts) {
        return this.createErrorResult("No response from Gemini TTS API");
      }

      const parts = response.candidates[0].content.parts;
      let audioData: Uint8Array | null = null;

      for (const part of parts) {
        if (part?.inlineData?.data) {
          // Use Buffer.from for safe base64 decoding (avoids stack overflow on large payloads)
          const raw = new Uint8Array(
            Buffer.from(part.inlineData.data, "base64"),
          );

          // If the API returns raw PCM, wrap it with a WAV header for playability.
          // If it already returns WAV (starts with "RIFF"), use it as-is.
          const isWav =
            raw.length > 4 &&
            raw[0] === 0x52 &&
            raw[1] === 0x49 &&
            raw[2] === 0x46 &&
            raw[3] === 0x46;

          audioData = isWav ? raw : wrapPcmAsWav(raw);
          break;
        }
      }

      if (!audioData) {
        return this.createErrorResult("No audio generated in response");
      }

      const usageMetadata = response.usageMetadata;
      const usage = calculateTokenUsage(
        usageMetadata?.promptTokenCount ?? 0,
        usageMetadata?.candidatesTokenCount ?? 0,
        PRICING,
      );

      return this.createSuccessResult(
        {
          audio: {
            data: audioData,
            mimeType: "audio/wav",
          },
          ...(usageMetadata && {
            usage_metadata: {
              promptTokenCount: usageMetadata.promptTokenCount,
              candidatesTokenCount: usageMetadata.candidatesTokenCount,
              totalTokenCount: usageMetadata.totalTokenCount,
            },
          }),
        },
        usage,
      );
    } catch (error) {
      console.error("Gemini TTS error:", error);
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }
}
