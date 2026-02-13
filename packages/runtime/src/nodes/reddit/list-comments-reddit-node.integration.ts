import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { ListCommentsRedditNode } from "./list-comments-reddit-node";
import { ListPostsRedditNode } from "./list-posts-reddit-node";
import {
  createRedditTestContext,
  REDDIT_TEST_CONFIG,
  skipIfNoRedditToken,
} from "./reddit-test-helper";

describe("ListCommentsRedditNode", () => {
  it.skipIf(skipIfNoRedditToken())(
    "should list comments on a post in r/dafthunk_test",
    async () => {
      // First, get a post ID
      const listNode = new ListPostsRedditNode({
        nodeId: "list-posts-reddit",
      } as unknown as Node);

      const listContext = createRedditTestContext("list-posts-reddit", {
        subreddit: REDDIT_TEST_CONFIG.subreddit,
        sort: "new",
        limit: 5,
      });

      const listResult = await listNode.execute(listContext);

      expect(listResult.status).toBe("completed");
      const posts = listResult.outputs?.posts as Array<{
        id: string;
        num_comments: number;
      }>;

      if (!posts || posts.length === 0) {
        console.log(
          "No posts found in test subreddit, skipping list-comments test"
        );
        return;
      }

      // Find a post with comments, or use the first one
      const postWithComments =
        posts.find((p) => p.num_comments > 0) || posts[0];
      const postId = postWithComments.id;

      // Now get comments
      const commentsNode = new ListCommentsRedditNode({
        nodeId: "list-comments-reddit",
      } as unknown as Node);

      const commentsContext = createRedditTestContext("list-comments-reddit", {
        postId,
        subreddit: REDDIT_TEST_CONFIG.subreddit,
        sort: "best",
        limit: 50,
      });

      const commentsResult = await commentsNode.execute(commentsContext);

      expect(commentsResult.status).toBe("completed");
      expect(commentsResult.outputs?.comments).toBeDefined();
      expect(Array.isArray(commentsResult.outputs?.comments)).toBe(true);
      expect(commentsResult.outputs?.post).toBeDefined();
      expect(typeof commentsResult.outputs?.count).toBe("number");
    }
  );
});
