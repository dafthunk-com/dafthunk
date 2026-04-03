import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { SearchMediaWikiNode } from "./search-mediawiki-node";

describe("SearchMediaWikiNode", () => {
  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId: "search-mediawiki",
      inputs,
      organizationId: "test-org",
      env: {},
    }) as unknown as NodeContext;

  it("should return error for missing base URL", async () => {
    const node = new SearchMediaWikiNode({
      nodeId: "search-mediawiki",
    } as unknown as Node);
    const result = await node.execute(createContext({ query: "test" }));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Base URL is required");
  });

  it("should return error for missing query", async () => {
    const node = new SearchMediaWikiNode({
      nodeId: "search-mediawiki",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ baseUrl: "https://en.wikipedia.org" })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Search query is required");
  });

  it("should return error for invalid base URL", async () => {
    const node = new SearchMediaWikiNode({
      nodeId: "search-mediawiki",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ baseUrl: "not-a-url", query: "test" })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Invalid base URL");
  });
});
