import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { DeletePostWordPressNode } from "./delete-post-wordpress-node";

describe("DeletePostWordPressNode", () => {
  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId: "delete-post-wordpress",
      inputs,
      organizationId: "test-org",
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    }) as unknown as NodeContext;

  it("returns an error when integrationId is missing", async () => {
    const node = new DeletePostWordPressNode({
      nodeId: "delete-post-wordpress",
    } as unknown as Node);
    const result = await node.execute(createContext({ postId: 1 }));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Integration ID is required");
  });

  it("returns an error when postId is missing", async () => {
    const node = new DeletePostWordPressNode({
      nodeId: "delete-post-wordpress",
    } as unknown as Node);
    const result = await node.execute(createContext({ integrationId: "test" }));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Post ID is required");
  });
});
