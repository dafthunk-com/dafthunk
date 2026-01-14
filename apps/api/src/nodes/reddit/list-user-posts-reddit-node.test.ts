import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import type { NodeContext } from "../types";
import { ListUserPostsRedditNode } from "./list-user-posts-reddit-node";

describe("ListUserPostsRedditNode", () => {
  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId: "list-user-posts-reddit",
      inputs,
      organizationId: "test-org",
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    }) as unknown as NodeContext;

  it("should return error for missing integration ID", async () => {
    const node = new ListUserPostsRedditNode({
      nodeId: "list-user-posts-reddit",
    } as unknown as Node);
    const result = await node.execute(createContext({ username: "testuser" }));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Integration ID is required");
  });

  it("should return error for missing username", async () => {
    const node = new ListUserPostsRedditNode({
      nodeId: "list-user-posts-reddit",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ integrationId: "test-integration" })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Username is required");
  });

  it("should return error for invalid sort method", async () => {
    const node = new ListUserPostsRedditNode({
      nodeId: "list-user-posts-reddit",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        integrationId: "test-integration",
        username: "testuser",
        sort: "invalid",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Invalid sort method");
  });
});
