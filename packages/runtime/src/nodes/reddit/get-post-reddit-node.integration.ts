import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { GetPostRedditNode } from "./get-post-reddit-node";
import { ListPostsRedditNode } from "./list-posts-reddit-node";
import {
  createRedditTestContext,
  REDDIT_TEST_CONFIG,
  skipIfNoRedditToken,
} from "./reddit-test-helper";

describe("GetPostRedditNode", () => {
  it.skipIf(skipIfNoRedditToken())(
    "should get a specific post from r/dafthunk_test",
    async () => {
      // First, get a post ID
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
      const posts = listResult.outputs?.posts as Array<{
        id: string;
        title: string;
      }>;

      if (!posts || posts.length === 0) {
        console.log("No posts found in test subreddit, skipping get-post test");
        return;
      }

      const postId = posts[0].id;
      const expectedTitle = posts[0].title;

      // Now get the specific post
      const getNode = new GetPostRedditNode({
        nodeId: "get-post-reddit",
      } as unknown as Node);

      const getContext = createRedditTestContext("get-post-reddit", {
        postId,
      });

      expect(getContext).not.toBeNull();
      const getResult = await getNode.execute(getContext!);

      expect(getResult.status).toBe("completed");
      expect(getResult.outputs?.id).toBe(postId);
      expect(getResult.outputs?.title).toBe(expectedTitle);
      expect(getResult.outputs?.subreddit).toBe(REDDIT_TEST_CONFIG.subreddit);
      expect(getResult.outputs?.post).toBeDefined();
    }
  );
});
