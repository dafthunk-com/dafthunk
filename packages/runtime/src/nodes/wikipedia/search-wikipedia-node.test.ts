import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { SearchWikipediaNode } from "./search-wikipedia-node";

describe("SearchWikipediaNode", () => {
  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId: "search-wikipedia",
      inputs,
      organizationId: "test-org",
      env: {},
    }) as unknown as NodeContext;

  it("should return error for missing query", async () => {
    const node = new SearchWikipediaNode({
      nodeId: "search-wikipedia",
    } as unknown as Node);
    const result = await node.execute(createContext({}));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Search query is required");
  });

  it("should return error for invalid language code", async () => {
    const node = new SearchWikipediaNode({
      nodeId: "search-wikipedia",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ query: "test", language: "invalid!" })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Invalid language code");
  });
});
