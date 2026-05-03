import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { CreatePostWordPressNode } from "./create-post-wordpress-node";

describe("CreatePostWordPressNode", () => {
  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId: "create-post-wordpress",
      inputs,
      organizationId: "test-org",
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    }) as unknown as NodeContext;

  it("returns an error when integrationId is missing", async () => {
    const node = new CreatePostWordPressNode({
      nodeId: "create-post-wordpress",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ title: "Hi", content: "..." })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Integration ID is required");
  });

  it("returns an error when title is missing", async () => {
    const node = new CreatePostWordPressNode({
      nodeId: "create-post-wordpress",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ integrationId: "test", content: "..." })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Title is required");
  });

  it("returns an error when content is missing", async () => {
    const node = new CreatePostWordPressNode({
      nodeId: "create-post-wordpress",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ integrationId: "test", title: "Hi" })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Content is required");
  });
});
