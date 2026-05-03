import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { SearchWordPressNode } from "./search-wordpress-node";

describe("SearchWordPressNode", () => {
  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId: "search-wordpress",
      inputs,
      organizationId: "test-org",
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    }) as unknown as NodeContext;

  it("returns an error when integrationId is missing", async () => {
    const node = new SearchWordPressNode({
      nodeId: "search-wordpress",
    } as unknown as Node);
    const result = await node.execute(createContext({ search: "hello" }));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Integration ID is required");
  });

  it("returns an error when search is missing", async () => {
    const node = new SearchWordPressNode({
      nodeId: "search-wordpress",
    } as unknown as Node);
    const result = await node.execute(createContext({ integrationId: "test" }));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Search query is required");
  });
});
