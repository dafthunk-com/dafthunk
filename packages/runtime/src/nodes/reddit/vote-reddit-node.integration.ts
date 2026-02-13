import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { ListPostsRedditNode } from "./list-posts-reddit-node";
import {
  createRedditTestContext,
  REDDIT_TEST_CONFIG,
  skipIfNoRedditToken,
} from "./reddit-test-helper";
import { VoteRedditNode } from "./vote-reddit-node";

describe("VoteRedditNode", () => {
  it.skipIf(skipIfNoRedditToken())(
    "should upvote and then unvote a post in r/dafthunk_test",
    async () => {
      // First, get a post to vote on
      const listNode = new ListPostsRedditNode({
        nodeId: "list-posts-reddit",
      } as unknown as Node);

      const listContext = createRedditTestContext("list-posts-reddit", {
        subreddit: REDDIT_TEST_CONFIG.subreddit,
        sort: "new",
        limit: 1,
      });

      const listResult = await listNode.execute(listContext);

      expect(listResult.status).toBe("completed");
      const posts = listResult.outputs?.posts as Array<{ name: string }>;

      if (!posts || posts.length === 0) {
        console.log("No posts found in test subreddit, skipping vote test");
        return;
      }

      const thingId = posts[0].name; // e.g., "t3_abc123"

      const voteNode = new VoteRedditNode({
        nodeId: "vote-reddit",
      } as unknown as Node);

      // Upvote
      const upvoteContext = createRedditTestContext("vote-reddit", {
        thingId,
        direction: 1,
      });

      const upvoteResult = await voteNode.execute(upvoteContext);

      expect(upvoteResult.status).toBe("completed");
      expect(upvoteResult.outputs?.success).toBe(true);

      // Unvote (reset)
      const unvoteContext = createRedditTestContext("vote-reddit", {
        thingId,
        direction: 0,
      });

      const unvoteResult = await voteNode.execute(unvoteContext);

      expect(unvoteResult.status).toBe("completed");
      expect(unvoteResult.outputs?.success).toBe(true);
    }
  );
});
