import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import {
  createRedditTestContext,
  skipIfNoRedditToken,
} from "./reddit-test-helper";
import { SearchSubredditsRedditNode } from "./search-subreddits-reddit-node";

describe("SearchSubredditsRedditNode", () => {
  it.skipIf(skipIfNoRedditToken())(
    "should search for subreddits by query",
    async () => {
      const node = new SearchSubredditsRedditNode({
        nodeId: "search-subreddits-reddit",
      } as unknown as Node);

      const context = createRedditTestContext("search-subreddits-reddit", {
        query: "programming",
        limit: 10,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.subreddits).toBeDefined();
      expect(Array.isArray(result.outputs?.subreddits)).toBe(true);
      expect(typeof result.outputs?.count).toBe("number");

      // Verify subreddit structure
      if ((result.outputs?.subreddits as unknown[]).length > 0) {
        const subreddit = (
          result.outputs?.subreddits as Record<string, unknown>[]
        )[0];
        expect(subreddit.name).toBeDefined();
        expect(typeof subreddit.subscribers).toBe("number");
      }
    }
  );
});
