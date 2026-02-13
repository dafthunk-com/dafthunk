import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { ListPostsRedditNode } from "./list-posts-reddit-node";
import {
  createRedditTestContext,
  REDDIT_TEST_CONFIG,
  skipIfNoRedditToken,
} from "./reddit-test-helper";
import { SubmitCommentRedditNode } from "./submit-comment-reddit-node";

describe("SubmitCommentRedditNode", () => {
  it.skipIf(skipIfNoRedditToken())(
    "should submit a comment on a post in r/dafthunk_test",
    async () => {
      // First, get a post to comment on
      const listNode = new ListPostsRedditNode({
        nodeId: "list-posts-reddit",
      } as unknown as Node);

      const listContext = createRedditTestContext("list-posts-reddit", {
        subreddit: REDDIT_TEST_CONFIG.subreddit,
        sort: "new",
        limit: 1,
      });

      expect(listContext).not.toBeNull();
      const listResult = await listNode.execute(listContext!);

      expect(listResult.status).toBe("completed");
      const posts = listResult.outputs?.posts as Array<{ name: string }>;

      if (!posts || posts.length === 0) {
        console.log("No posts found in test subreddit, skipping comment test");
        return;
      }

      const parentId = posts[0].name; // e.g., "t3_abc123"

      // Now submit a comment
      const commentNode = new SubmitCommentRedditNode({
        nodeId: "submit-comment-reddit",
      } as unknown as Node);

      const commentContext = createRedditTestContext("submit-comment-reddit", {
        parentId,
        text: `Automated test comment at ${new Date().toISOString()}`,
      });

      expect(commentContext).not.toBeNull();
      const commentResult = await commentNode.execute(commentContext!);

      expect(commentResult.status).toBe("completed");
      expect(commentResult.outputs?.id).toBeDefined();
      expect(typeof commentResult.outputs?.id).toBe("string");
    }
  );
});
