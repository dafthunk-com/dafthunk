import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { ListCommentsRedditNode } from "./list-comments-reddit-node";

describe("ListCommentsRedditNode", () => {
  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId: "list-comments-reddit",
      inputs,
      organizationId: "test-org",
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    }) as unknown as NodeContext;

  it("should return error for missing integration ID", async () => {
    const node = new ListCommentsRedditNode({
      nodeId: "list-comments-reddit",
    } as unknown as Node);
    const result = await node.execute(createContext({ postId: "abc123" }));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Integration ID is required");
  });

  it("should return error for missing post ID", async () => {
    const node = new ListCommentsRedditNode({
      nodeId: "list-comments-reddit",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ integrationId: "test-integration" })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Post ID is required");
  });

  it("should return error for invalid sort method", async () => {
    const node = new ListCommentsRedditNode({
      nodeId: "list-comments-reddit",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        integrationId: "test-integration",
        postId: "abc123",
        sort: "invalid",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Invalid sort method");
  });
});
