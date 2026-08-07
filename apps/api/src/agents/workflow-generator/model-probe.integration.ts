import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import type { Bindings } from "../../context";

/**
 * Which Workers AI text models actually answer, and in what shape.
 *
 * Written because a model swap produced four consecutive 504s in the
 * evaluation suite and the logs could not say whether the model was
 * unreachable for this account or merely slower than something upstream was
 * willing to wait for. Those have opposite fixes, and guessing between them
 * costs a full evaluation run each time.
 *
 * Deliberately tiny — a six-word prompt and a low token ceiling. If a request
 * this small times out, size is not the problem.
 *
 *   pnpm --filter '@dafthunk/api' eval:probe
 */

const bindings = env as unknown as Bindings;

const MODELS = [
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "@cf/zai-org/glm-4.7-flash",
  "@cf/qwen/qwen3-30b-a3b-fp8",
];

/**
 * Cold start or throughput?
 *
 * A trivial prompt cannot tell them apart, and the difference decides whether a
 * slow model is merely slow to wake or unusable for real work: one is amortized
 * across a warm workflow, the other multiplies by every token asked for.
 */
describe("workers ai throughput", () => {
  for (const model of [MODELS[0], MODELS[1]]) {
    it(`generates a few hundred tokens: ${model}`, async () => {
      const started = Date.now();
      try {
        const result = (await bindings.AI.run(
          model as never,
          {
            prompt:
              "Write three paragraphs about why small teams automate invoicing.",
            max_tokens: 512,
          } as never
        )) as unknown as Record<string, unknown>;

        const text = JSON.stringify(result);
        console.log(
          `[probe] ${model} max_tokens=512 ${Date.now() - started}ms chars=${text.length}`
        );
      } catch (error) {
        console.log(
          `[probe] ${model} max_tokens=512 ${Date.now() - started}ms FAILED ${
            error instanceof Error ? error.message.slice(0, 160) : String(error)
          }`
        );
      }
      expect(true).toBe(true);
    }, 300_000);
  }
});

describe("workers ai reachability", () => {
  for (const model of MODELS) {
    it(`answers a trivial prompt: ${model}`, async () => {
      const started = Date.now();
      let outcome: string;
      let shape: string[] = [];

      try {
        const result = (await bindings.AI.run(
          model as never,
          {
            prompt: "Say hello in French.",
            max_tokens: 32,
          } as never
        )) as unknown as Record<string, unknown>;

        shape = Object.keys(result ?? {});
        outcome = "ok";
        console.log(
          `[probe] ${model} ${Date.now() - started}ms keys=${shape.join(",")}\n` +
            `  ${JSON.stringify(result).slice(0, 400)}`
        );
      } catch (error) {
        outcome = error instanceof Error ? error.message : String(error);
        console.log(
          `[probe] ${model} ${Date.now() - started}ms FAILED ${outcome.slice(0, 200)}`
        );
      }

      // Reported, not asserted: the point is the log line for every model, and
      // a throw on the first would hide the ones after it.
      expect(typeof outcome).toBe("string");
    }, 180_000);
  }
});
