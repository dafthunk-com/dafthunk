import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { ListPostsRedditNode } from "./list-posts-reddit-node";
import {
  createRedditTestContext,
  REDDIT_TEST_CONFIG,
  skipIfNoRedditToken,
} from "./reddit-test-helper";

describe("ListPostsRedditNode", () => {
  it.skipIf(skipIfNoRedditToken())(
    "should list posts from r/dafthunk_test",
    async () => {
      const node = new ListPostsRedditNode({
        nodeId: "list-posts-reddit",
      } as unknown as Node);

      const context = createRedditTestContext("list-posts-reddit", {
        subreddit: REDDIT_TEST_CONFIG.subreddit,
        sort: "new",
        limit: 10,
      });

      expect(context).not.toBeNull();
      const result = await node.execute(context!);

      expect(result.status).toBe("completed");
      expect(result.outputs?.posts).toBeDefined();
      expect(Array.isArray(result.outputs?.posts)).toBe(true);
      expect(typeof result.outputs?.count).toBe("number");
    }
  );
});
