import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import {
  createRedditTestContext,
  REDDIT_TEST_CONFIG,
  skipIfNoRedditToken,
} from "./reddit-test-helper";
import { SharePostRedditNode } from "./share-post-reddit-node";

describe("SharePostRedditNode", () => {
  it.skipIf(skipIfNoRedditToken())(
    "should share a text post to r/dafthunk_test",
    async () => {
      const node = new SharePostRedditNode({
        nodeId: "share-post-reddit",
      } as unknown as Node);

      const timestamp = Date.now();
      const context = createRedditTestContext("share-post-reddit", {
        subreddit: REDDIT_TEST_CONFIG.subreddit,
        title: `Integration Test Post ${timestamp}`,
        kind: "self",
        text: `This is an automated test post created at ${new Date().toISOString()}.\n\nPlease ignore this post.`,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.id).toBeDefined();
      expect(result.outputs?.name).toBeDefined();
      expect(result.outputs?.url).toBeDefined();
      expect(typeof result.outputs?.id).toBe("string");
    }
  );
});
