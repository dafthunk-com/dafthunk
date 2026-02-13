import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { GetSubredditRedditNode } from "./get-subreddit-reddit-node";
import {
  createRedditTestContext,
  REDDIT_TEST_CONFIG,
  skipIfNoRedditToken,
} from "./reddit-test-helper";

describe("GetSubredditRedditNode", () => {
  it.skipIf(skipIfNoRedditToken())(
    "should get subreddit info for r/dafthunk_test",
    async () => {
      const node = new GetSubredditRedditNode({
        nodeId: "get-subreddit-reddit",
      } as unknown as Node);

      const context = createRedditTestContext("get-subreddit-reddit", {
        subreddit: REDDIT_TEST_CONFIG.subreddit,
      });

      expect(context).not.toBeNull();
      const result = await node.execute(context!);

      expect(result.status).toBe("completed");
      expect(result.outputs?.name).toBe(REDDIT_TEST_CONFIG.subreddit);
      expect(result.outputs?.subreddit).toBeDefined();
      expect(typeof result.outputs?.subscribers).toBe("number");
    }
  );
});
