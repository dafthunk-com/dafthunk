import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import type { NodeContext } from "../../runtime/node-types";
import { SubmitCommentRedditNode } from "./submit-comment-reddit-node";

describe("SubmitCommentRedditNode", () => {
  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId: "submit-comment-reddit",
      inputs,
      organizationId: "test-org",
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    }) as unknown as NodeContext;

  it("should return error for missing integration ID", async () => {
    const node = new SubmitCommentRedditNode({
      nodeId: "submit-comment-reddit",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ parentId: "t3_abc123", text: "test" })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Integration ID is required");
  });

  it("should return error for missing parent ID", async () => {
    const node = new SubmitCommentRedditNode({
      nodeId: "submit-comment-reddit",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ integrationId: "test-integration", text: "test" })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Parent ID is required");
  });

  it("should return error for missing text", async () => {
    const node = new SubmitCommentRedditNode({
      nodeId: "submit-comment-reddit",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        integrationId: "test-integration",
        parentId: "t3_abc123",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Comment text is required");
  });
});
