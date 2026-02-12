import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import type { NodeContext } from "@dafthunk/runtime";
import { GetSubredditRedditNode } from "./get-subreddit-reddit-node";

describe("GetSubredditRedditNode", () => {
  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId: "get-subreddit-reddit",
      inputs,
      organizationId: "test-org",
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    }) as unknown as NodeContext;

  it("should return error for missing integration ID", async () => {
    const node = new GetSubredditRedditNode({
      nodeId: "get-subreddit-reddit",
    } as unknown as Node);
    const result = await node.execute(createContext({ subreddit: "test" }));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Integration ID is required");
  });

  it("should return error for missing subreddit", async () => {
    const node = new GetSubredditRedditNode({
      nodeId: "get-subreddit-reddit",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ integrationId: "test-integration" })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Subreddit is required");
  });
});
