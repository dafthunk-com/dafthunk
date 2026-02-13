import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { ListUserPostsRedditNode } from "./list-user-posts-reddit-node";
import {
  createRedditTestContext,
  REDDIT_TEST_CONFIG,
  skipIfNoRedditToken,
} from "./reddit-test-helper";

describe("ListUserPostsRedditNode", () => {
  it.skipIf(skipIfNoRedditToken())(
    "should list posts by u/bchapuis",
    async () => {
      const node = new ListUserPostsRedditNode({
        nodeId: "list-user-posts-reddit",
      } as unknown as Node);

      const context = createRedditTestContext("list-user-posts-reddit", {
        username: REDDIT_TEST_CONFIG.username,
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
