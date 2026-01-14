import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { GetUserRedditNode } from "./get-user-reddit-node";
import {
  createRedditTestContext,
  REDDIT_TEST_CONFIG,
  skipIfNoRedditToken,
} from "./reddit-test-helper";

describe("GetUserRedditNode", () => {
  it.skipIf(skipIfNoRedditToken())(
    "should get user info for u/bchapuis",
    async () => {
      const node = new GetUserRedditNode({
        nodeId: "get-user-reddit",
      } as unknown as Node);

      const context = createRedditTestContext("get-user-reddit", {
        username: REDDIT_TEST_CONFIG.username,
      });

      expect(context).not.toBeNull();
      const result = await node.execute(context!);

      expect(result.status).toBe("completed");
      expect(result.outputs?.name).toBe(REDDIT_TEST_CONFIG.username);
      expect(result.outputs?.user).toBeDefined();
      expect(typeof result.outputs?.linkKarma).toBe("number");
      expect(typeof result.outputs?.commentKarma).toBe("number");
    }
  );
});
