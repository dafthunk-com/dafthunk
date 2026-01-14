import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import type { NodeContext } from "../types";
import { SearchRedditNode } from "./search-reddit-node";

describe("SearchRedditNode", () => {
  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId: "search-reddit",
      inputs,
      organizationId: "test-org",
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    }) as unknown as NodeContext;

  it("should return error for missing integration ID", async () => {
    const node = new SearchRedditNode({
      nodeId: "search-reddit",
    } as unknown as Node);
    const result = await node.execute(createContext({ query: "test" }));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Integration ID is required");
  });

  it("should return error for missing query", async () => {
    const node = new SearchRedditNode({
      nodeId: "search-reddit",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ integrationId: "test-integration" })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Search query is required");
  });

  it("should return error for invalid sort method", async () => {
    const node = new SearchRedditNode({
      nodeId: "search-reddit",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        integrationId: "test-integration",
        query: "test",
        sort: "invalid",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Invalid sort method");
  });

  it("should return error for invalid type filter", async () => {
    const node = new SearchRedditNode({
      nodeId: "search-reddit",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        integrationId: "test-integration",
        query: "test",
        type: "invalid",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Invalid type filter");
  });
});
