import type { NodeContext } from "@dafthunk/runtime";
import { ExecutableNode } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { z } from "zod";

/**
 * Response shape from Replicate predictions API
 */
interface ReplicatePrediction {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: string;
  error?: string;
}

const VOICE_OPTIONS = [
  // American English Female
  "af_heart",
  "af_alloy",
  "af_aoede",
  "af_bella",
  "af_jessica",
  "af_kore",
  "af_nicole",
  "af_nova",
  "af_river",
  "af_sarah",
  "af_sky",
  // American English Male
  "am_adam",
  "am_echo",
  "am_eric",
  "am_fenrir",
  "am_liam",
  "am_michael",
  "am_onyx",
  "am_puck",
  "am_santa",
  // British English Female
  "bf_alice",
  "bf_emma",
  "bf_isabella",
  "bf_lily",
  // British English Male
  "bm_daniel",
  "bm_fable",
  "bm_george",
  "bm_lewis",
  // Japanese Female
  "jf_alpha",
  "jf_gongitsune",
  "jf_nezumi",
  "jf_tebukuro",
  // Japanese Male
  "jm_kumo",
  // Mandarin Chinese Female
  "zf_xiaobei",
  "zf_xiaoni",
  "zf_xiaoxiao",
  "zf_xiaoyi",
  // Mandarin Chinese Male
  "zm_yunjian",
  "zm_yunxi",
  "zm_yunxia",
  "zm_yunyang",
  // Spanish Female
  "ef_dora",
  // Spanish Male
  "em_alex",
  "em_santa",
  // French Female
  "ff_siwis",
  // Hindi Female
  "hf_alpha",
  "hf_beta",
  // Hindi Male
  "hm_omega",
  "hm_psi",
  // Italian Female
  "if_sara",
  // Italian Male
  "im_nicola",
  // Brazilian Portuguese Female
  "pf_dora",
  // Brazilian Portuguese Male
  "pm_alex",
  "pm_santa",
] as const;

/**
 * Kokoro 82M text-to-speech node using Replicate API.
 * Based on StyleTTS 2, supports 54 voices across 9 languages.
 * @see https://replicate.com/jaaari/kokoro-82m
 */
export class Kokoro82mNode extends ExecutableNode {
  private static readonly inputSchema = z.object({
    text: z.string().min(1),
    voice: z.enum(VOICE_OPTIONS).optional().default("af_heart"),
    speed: z.coerce.number().min(0.1).max(5.0).optional().default(1.0),
  });

  public static readonly nodeType: NodeType = {
    id: "kokoro-82m",
    name: "Text to Speech (Kokoro)",
    type: "kokoro-82m",
    description:
      "Converts text to natural-sounding speech using Kokoro 82M AI with 54 voices across 9 languages",
    tags: ["Audio", "TTS", "Replicate", "Kokoro", "Text-to-Speech"],
    icon: "mic",
    documentation:
      "This node converts text to natural-sounding speech using the Kokoro 82M model via Replicate. Based on StyleTTS 2, it supports 54 voices across 9 languages including English, Japanese, Mandarin, Spanish, French, Hindi, Italian, and Brazilian Portuguese.",
    referenceUrl: "https://replicate.com/jaaari/kokoro-82m",
    inlinable: false,
    usage: 1,
    inputs: [
      {
        name: "text",
        type: "string",
        description: "Text to convert to speech",
        required: true,
      },
      {
        name: "voice",
        type: "string",
        description: "Voice to use for speech synthesis",
        value: "af_heart",
      },
      {
        name: "speed",
        type: "number",
        description: "Speech rate multiplier (0.1 to 5.0)",
        value: 1.0,
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "audio",
        type: "audio",
        description: "Generated speech audio",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const validatedInput = Kokoro82mNode.inputSchema.parse(context.inputs);

      // Get Replicate API token from environment
      const { REPLICATE_API_TOKEN } = context.env;
      if (!REPLICATE_API_TOKEN) {
        return this.createErrorResult(
          "REPLICATE_API_TOKEN environment variable is not configured"
        );
      }

      // Create prediction with sync mode (waits up to 60s)
      const syncTimeout = 60;
      const maxWaitTime = 300000; // 5 minutes total
      const startTime = Date.now();

      console.log("Kokoro82mNode: Creating prediction");

      const createResponse = await fetch(
        "https://api.replicate.com/v1/predictions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
            "Content-Type": "application/json",
            Prefer: `wait=${syncTimeout}`,
          },
          body: JSON.stringify({
            version:
              "f559560eb822dc509045f3921a1921234918b91739db4bf3daab2169b71c7a13",
            input: {
              text: validatedInput.text,
              voice: validatedInput.voice,
              speed: validatedInput.speed,
            },
          }),
        }
      );

      console.log(
        "Kokoro82mNode: Create response status:",
        createResponse.status
      );

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error("Kokoro82mNode: Create prediction failed:", errorText);
        return this.createErrorResult(
          `Failed to create Replicate prediction: ${createResponse.status} ${errorText}`
        );
      }

      let prediction = (await createResponse.json()) as ReplicatePrediction;
      console.log(
        "Kokoro82mNode: Initial prediction:",
        JSON.stringify({
          id: prediction.id,
          status: prediction.status,
        })
      );

      // Poll until completion or timeout
      while (
        prediction.status !== "succeeded" &&
        prediction.status !== "failed" &&
        prediction.status !== "canceled" &&
        Date.now() - startTime < maxWaitTime
      ) {
        if (context.onProgress) {
          const elapsed = Date.now() - startTime;
          context.onProgress(Math.min(0.9, elapsed / maxWaitTime));
        }

        // Poll Replicate API for prediction status
        const pollUrl = `https://api.replicate.com/v1/predictions/${prediction.id}`;
        console.log("Kokoro82mNode: Polling:", pollUrl);

        const pollResponse = await fetch(pollUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
            "Content-Type": "application/json",
            Prefer: `wait=${syncTimeout}`,
          },
        });

        console.log(
          "Kokoro82mNode: Poll response status:",
          pollResponse.status
        );

        if (!pollResponse.ok) {
          const errorText = await pollResponse.text();
          console.error("Kokoro82mNode: Poll failed:", errorText);
          return this.createErrorResult(
            `Failed to poll prediction status: ${pollResponse.status} ${errorText}`
          );
        }

        prediction = (await pollResponse.json()) as ReplicatePrediction;
        console.log(
          "Kokoro82mNode: Poll result:",
          JSON.stringify({
            id: prediction.id,
            status: prediction.status,
            hasOutput: !!prediction.output,
          })
        );
      }

      if (prediction.status === "failed") {
        return this.createErrorResult(
          `Kokoro generation failed: ${prediction.error || "Unknown error"}`
        );
      }

      if (prediction.status === "canceled") {
        return this.createErrorResult("Kokoro generation was canceled");
      }

      if (prediction.status !== "succeeded") {
        return this.createErrorResult(
          `Kokoro generation timed out after ${maxWaitTime / 60000} minutes`
        );
      }

      if (!prediction.output) {
        return this.createErrorResult(
          "Kokoro generation succeeded but no output was returned"
        );
      }

      // Download the audio file
      const audioResponse = await fetch(prediction.output);
      if (!audioResponse.ok) {
        return this.createErrorResult(
          `Failed to download audio file: ${audioResponse.status}`
        );
      }

      const contentType =
        audioResponse.headers.get("content-type") || "audio/wav";

      return this.createSuccessResult({
        audio: {
          data: new Uint8Array(await audioResponse.arrayBuffer()),
          mimeType: contentType,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; ");
        return this.createErrorResult(`Validation error: ${errorMessages}`);
      }

      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
