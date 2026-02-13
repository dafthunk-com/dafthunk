import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { ListUserCommentsRedditNode } from "./list-user-comments-reddit-node";
import {
  createRedditTestContext,
  REDDIT_TEST_CONFIG,
  skipIfNoRedditToken,
} from "./reddit-test-helper";

describe("ListUserCommentsRedditNode", () => {
  it.skipIf(skipIfNoRedditToken())(
    "should list comments by u/bchapuis",
    async () => {
      const node = new ListUserCommentsRedditNode({
        nodeId: "list-user-comments-reddit",
      } as unknown as Node);

      const context = createRedditTestContext("list-user-comments-reddit", {
        username: REDDIT_TEST_CONFIG.username,
        sort: "new",
        limit: 10,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.comments).toBeDefined();
      expect(Array.isArray(result.outputs?.comments)).toBe(true);
      expect(typeof result.outputs?.count).toBe("number");
    }
  );
});
