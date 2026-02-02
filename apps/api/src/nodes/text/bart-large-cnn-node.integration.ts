import { env } from "cloudflare:test";
import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../../runtime/node-types";
import { BartLargeCnnNode } from "./bart-large-cnn-node";

describe("BartLargeCnnNode", () => {
  it("should execute summarization", async () => {
    const nodeId = "bart-large-cnn";
    const node = new BartLargeCnnNode({
      nodeId,
    } as unknown as Node);

    const inputText =
      "Paris is the capital and most populous city of France. With an official estimated population of 2,102,650 residents as of 1 January 2023 in an area of more than 105 km², Paris is the fourth-most populated city in the European Union and the 30th most densely populated city in the world in 2022. Since the 17th century, Paris has been one of the world's major centres of finance, diplomacy, commerce, culture, fashion, gastronomy and many areas.";
    const context = {
      nodeId,
      inputs: {
        inputText,
        maxLength: 1024,
      },
      env: {
        AI: env.AI,
      },
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.summary).toBeDefined();
    expect(typeof result.outputs?.summary).toBe("string");
    expect(result.outputs?.summary.length).toBeLessThan(inputText.length);
  });
});
