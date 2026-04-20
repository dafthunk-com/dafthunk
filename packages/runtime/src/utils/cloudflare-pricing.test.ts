import { describe, expect, it } from "vitest";
import {
  CLOUDFLARE_MODEL_PRICING,
  getCloudflareModelPricing,
} from "./cloudflare-pricing";

describe("cloudflare-pricing", () => {
  it("returns undefined for unknown models", () => {
    expect(getCloudflareModelPricing("@cf/fake/unknown-model")).toBeUndefined();
  });

  it("returns pricing entries for seeded models", () => {
    expect(
      getCloudflareModelPricing("@cf/meta/llama-3.3-70b-instruct-fp8-fast")
    ).toEqual({
      inputCostPerMillion: 0.35,
      outputCostPerMillion: 0.75,
      outputEstimator: "tokens",
    });
  });

  it("covers models that have dedicated single-model nodes", () => {
    // Models wired as their own nodes in the Cloudflare registry. When a new
    // single-model node is added, its model id should also land here so the
    // generic node computes the same credits.
    const expected = [
      "@cf/meta/llama-3.1-8b-instruct-fast",
      "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      "@cf/meta/llama-4-scout-17b-16e-instruct",
      "@cf/meta/m2m100-1.2b",
      "@cf/qwen/qwen3-30b-a3b-fp8",
      "@cf/qwen/qwq-32b",
      "@cf/mistralai/mistral-small-3.1-24b-instruct",
      "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",
      "@cf/zai-org/glm-4.7-flash",
      "@cf/moonshotai/kimi-k2.5",
      "@hf/nousresearch/hermes-2-pro-mistral-7b",
      "@cf/openai/gpt-oss-20b",
      "@cf/openai/gpt-oss-120b",
      "@cf/facebook/bart-large-cnn",
      "@cf/huggingface/distilbert-sst-2-int8",
      "@cf/baai/bge-reranker-base",
      "@cf/stabilityai/stable-diffusion-xl-base-1.0",
      "@cf/bytedance/stable-diffusion-xl-lightning",
      "@cf/black-forest-labs/flux-1-schnell",
      "@cf/lykon/dreamshaper-8-lcm",
      "@cf/runwayml/stable-diffusion-v1-5-img2img",
      "@cf/runwayml/stable-diffusion-v1-5-inpainting",
      "@cf/microsoft/resnet-50",
      "@cf/facebook/detr-resnet-50",
      "@cf/llava-hf/llava-1.5-7b-hf",
      "@cf/unum/uform-gen2-qwen-500m",
      "@cf/openai/whisper",
      "@cf/openai/whisper-tiny-en",
      "@cf/openai/whisper-large-v3-turbo",
      "@cf/myshell-ai/melotts",
      "@cf/deepgram/aura-1",
      "@cf/deepgram/nova-3",
    ];
    for (const modelId of expected) {
      expect(
        CLOUDFLARE_MODEL_PRICING[modelId],
        `missing pricing for ${modelId}`
      ).toBeDefined();
    }
  });

  it("only uses the three supported estimators", () => {
    const allowed = new Set(["tokens", "bytes-per-1000", "bytes-per-100"]);
    for (const [modelId, pricing] of Object.entries(CLOUDFLARE_MODEL_PRICING)) {
      expect(
        allowed.has(pricing.outputEstimator),
        `invalid estimator on ${modelId}: ${pricing.outputEstimator}`
      ).toBe(true);
      expect(pricing.inputCostPerMillion).toBeGreaterThan(0);
      expect(pricing.outputCostPerMillion).toBeGreaterThan(0);
    }
  });
});
