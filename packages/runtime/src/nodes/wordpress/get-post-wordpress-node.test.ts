import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { GetPostWordPressNode } from "./get-post-wordpress-node";

describe("GetPostWordPressNode", () => {
  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId: "get-post-wordpress",
      inputs,
      organizationId: "test-org",
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    }) as unknown as NodeContext;

  it("returns an error when integrationId is missing", async () => {
    const node = new GetPostWordPressNode({
      nodeId: "get-post-wordpress",
    } as unknown as Node);
    const result = await node.execute(createContext({ postId: 1 }));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Integration ID is required");
  });

  it("returns an error when postId is missing", async () => {
    const node = new GetPostWordPressNode({
      nodeId: "get-post-wordpress",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ integrationId: "test-integration" })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Post ID is required");
  });
});
