import type { TokenPricing } from "./usage";

/**
 * Per-model pricing entry for Cloudflare Workers AI models. Extends the
 * shared `TokenPricing` shape with an `outputEstimator` hint that tells the
 * generic runtime how to count output tokens when the model's response
 * doesn't carry a `usage` block (image streams, audio bytes, etc.).
 *
 * @see https://developers.cloudflare.com/workers-ai/platform/pricing/
 */
export interface CloudflareModelPricing extends TokenPricing {
  /**
   *   "tokens"          → trust result.usage.{prompt,completion}_tokens (LLM default)
   *   "bytes-per-1000"  → estimate output tokens as outputBytes / 1000 (image)
   *   "bytes-per-100"   → estimate output tokens as outputBytes / 100 (audio)
   */
  outputEstimator: "tokens" | "bytes-per-1000" | "bytes-per-100";
}

/**
 * Catalog of per-model pricing. Seeded from the dedicated single-model nodes
 * under `packages/runtime/src/nodes/{text,image,audio,openai}/*-node.ts` so
 * the generic `CloudflareModelNode` computes the same usage they do for the
 * same model. Unknown models fall through to a flat 1-credit cost.
 *
 * When adding a new Cloudflare-hosted node (or surfacing a new model via the
 * catalog dialog), add its pricing row here too — the unit tests lock this
 * map against the dedicated-node registry to prevent regressions.
 */
export const CLOUDFLARE_MODEL_PRICING: Record<string, CloudflareModelPricing> =
  {
    // Text generation (LLMs) — token-metered
    "@cf/meta/llama-3.1-8b-instruct-fast": {
      inputCostPerMillion: 0.1,
      outputCostPerMillion: 0.1,
      outputEstimator: "tokens",
    },
    "@cf/meta/llama-3.3-70b-instruct-fp8-fast": {
      inputCostPerMillion: 0.35,
      outputCostPerMillion: 0.75,
      outputEstimator: "tokens",
    },
    "@cf/meta/llama-4-scout-17b-16e-instruct": {
      inputCostPerMillion: 0.15,
      outputCostPerMillion: 0.3,
      outputEstimator: "tokens",
    },
    "@cf/qwen/qwen3-30b-a3b-fp8": {
      inputCostPerMillion: 0.051,
      outputCostPerMillion: 0.34,
      outputEstimator: "tokens",
    },
    "@cf/qwen/qwq-32b": {
      inputCostPerMillion: 0.66,
      outputCostPerMillion: 1.0,
      outputEstimator: "tokens",
    },
    "@cf/mistralai/mistral-small-3.1-24b-instruct": {
      inputCostPerMillion: 0.2,
      outputCostPerMillion: 0.4,
      outputEstimator: "tokens",
    },
    "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b": {
      inputCostPerMillion: 0.25,
      outputCostPerMillion: 0.5,
      outputEstimator: "tokens",
    },
    "@cf/zai-org/glm-4.7-flash": {
      inputCostPerMillion: 0.06,
      outputCostPerMillion: 0.4,
      outputEstimator: "tokens",
    },
    "@cf/moonshotai/kimi-k2.5": {
      inputCostPerMillion: 0.6,
      outputCostPerMillion: 3.0,
      outputEstimator: "tokens",
    },
    "@hf/nousresearch/hermes-2-pro-mistral-7b": {
      inputCostPerMillion: 0.08,
      outputCostPerMillion: 0.08,
      outputEstimator: "tokens",
    },
    "@cf/openai/gpt-oss-20b": {
      inputCostPerMillion: 0.2,
      outputCostPerMillion: 0.3,
      outputEstimator: "tokens",
    },
    "@cf/openai/gpt-oss-120b": {
      inputCostPerMillion: 0.35,
      outputCostPerMillion: 0.75,
      outputEstimator: "tokens",
    },

    // Text utility models (classification / translation / summarisation / rerank)
    "@cf/facebook/bart-large-cnn": {
      inputCostPerMillion: 0.05,
      outputCostPerMillion: 0.1,
      outputEstimator: "tokens",
    },
    "@cf/huggingface/distilbert-sst-2-int8": {
      inputCostPerMillion: 0.02,
      outputCostPerMillion: 0.02,
      outputEstimator: "tokens",
    },
    "@cf/baai/bge-reranker-base": {
      inputCostPerMillion: 0.03,
      outputCostPerMillion: 0.03,
      outputEstimator: "tokens",
    },
    "@cf/meta/m2m100-1.2b": {
      inputCostPerMillion: 0.05,
      outputCostPerMillion: 0.1,
      outputEstimator: "tokens",
    },

    // Image generation — bytes-per-1000 estimator (output is a PNG/JPEG stream)
    "@cf/stabilityai/stable-diffusion-xl-base-1.0": {
      inputCostPerMillion: 0.1,
      outputCostPerMillion: 20.0,
      outputEstimator: "bytes-per-1000",
    },
    "@cf/bytedance/stable-diffusion-xl-lightning": {
      inputCostPerMillion: 0.1,
      outputCostPerMillion: 20.0,
      outputEstimator: "bytes-per-1000",
    },
    "@cf/black-forest-labs/flux-1-schnell": {
      inputCostPerMillion: 0.1,
      outputCostPerMillion: 25.0,
      outputEstimator: "bytes-per-1000",
    },
    "@cf/lykon/dreamshaper-8-lcm": {
      inputCostPerMillion: 0.1,
      outputCostPerMillion: 15.0,
      outputEstimator: "bytes-per-1000",
    },
    "@cf/runwayml/stable-diffusion-v1-5-img2img": {
      inputCostPerMillion: 0.1,
      outputCostPerMillion: 15.0,
      outputEstimator: "bytes-per-1000",
    },
    "@cf/runwayml/stable-diffusion-v1-5-inpainting": {
      inputCostPerMillion: 0.1,
      outputCostPerMillion: 15.0,
      outputEstimator: "bytes-per-1000",
    },

    // Image classification / image-to-text — token-metered (small outputs)
    "@cf/microsoft/resnet-50": {
      inputCostPerMillion: 0.03,
      outputCostPerMillion: 0.03,
      outputEstimator: "tokens",
    },
    "@cf/facebook/detr-resnet-50": {
      inputCostPerMillion: 0.05,
      outputCostPerMillion: 0.05,
      outputEstimator: "tokens",
    },
    "@cf/llava-hf/llava-1.5-7b-hf": {
      inputCostPerMillion: 0.08,
      outputCostPerMillion: 0.15,
      outputEstimator: "tokens",
    },
    "@cf/unum/uform-gen2-qwen-500m": {
      inputCostPerMillion: 0.03,
      outputCostPerMillion: 0.06,
      outputEstimator: "tokens",
    },

    // Speech — bytes-per-100 estimator (denser per-byte than images)
    "@cf/openai/whisper": {
      inputCostPerMillion: 0.05,
      outputCostPerMillion: 0.05,
      outputEstimator: "bytes-per-100",
    },
    "@cf/openai/whisper-tiny-en": {
      inputCostPerMillion: 0.02,
      outputCostPerMillion: 0.02,
      outputEstimator: "bytes-per-100",
    },
    "@cf/openai/whisper-large-v3-turbo": {
      inputCostPerMillion: 0.1,
      outputCostPerMillion: 0.1,
      outputEstimator: "bytes-per-100",
    },
    "@cf/myshell-ai/melotts": {
      inputCostPerMillion: 0.05,
      outputCostPerMillion: 0.1,
      outputEstimator: "bytes-per-100",
    },
    "@cf/deepgram/aura-1": {
      inputCostPerMillion: 0.1,
      outputCostPerMillion: 0.2,
      outputEstimator: "bytes-per-100",
    },
    "@cf/deepgram/nova-3": {
      inputCostPerMillion: 0.08,
      outputCostPerMillion: 0.08,
      outputEstimator: "bytes-per-100",
    },
  };

export function getCloudflareModelPricing(
  modelId: string
): CloudflareModelPricing | undefined {
  return CLOUDFLARE_MODEL_PRICING[modelId];
}
