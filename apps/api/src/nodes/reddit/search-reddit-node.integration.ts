import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import {
  createRedditTestContext,
  REDDIT_TEST_CONFIG,
  skipIfNoRedditToken,
} from "./reddit-test-helper";
import { SearchRedditNode } from "./search-reddit-node";

describe("SearchRedditNode", () => {
  it.skipIf(skipIfNoRedditToken())(
    "should search posts in r/dafthunk_test",
    async () => {
      const node = new SearchRedditNode({
        nodeId: "search-reddit",
      } as unknown as Node);

      const context = createRedditTestContext("search-reddit", {
        query: "test",
        subreddit: REDDIT_TEST_CONFIG.subreddit,
        limit: 10,
      });

      expect(context).not.toBeNull();
      const result = await node.execute(context!);

      expect(result.status).toBe("completed");
      expect(result.outputs?.results).toBeDefined();
      expect(Array.isArray(result.outputs?.results)).toBe(true);
      expect(typeof result.outputs?.count).toBe("number");
    }
  );

  it.skipIf(skipIfNoRedditToken())(
    "should search across all of Reddit",
    async () => {
      const node = new SearchRedditNode({
        nodeId: "search-reddit",
      } as unknown as Node);

      const context = createRedditTestContext("search-reddit", {
        query: "javascript",
        sort: "relevance",
        limit: 5,
      });

      expect(context).not.toBeNull();
      const result = await node.execute(context!);

      expect(result.status).toBe("completed");
      expect(result.outputs?.results).toBeDefined();
      expect(Array.isArray(result.outputs?.results)).toBe(true);
    }
  );
});
