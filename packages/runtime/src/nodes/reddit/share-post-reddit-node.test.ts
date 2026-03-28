import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { SharePostRedditNode } from "./share-post-reddit-node";

describe("SharePostRedditNode", () => {
  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId: "share-post-reddit",
      inputs,
      organizationId: "test-org",
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    }) as unknown as NodeContext;

  it("should return error for missing integration ID", async () => {
    const node = new SharePostRedditNode({
      nodeId: "share-post-reddit",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        subreddit: "test",
        title: "Test Post",
        kind: "self",
        text: "content",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Integration ID is required");
  });

  it("should return error for missing subreddit", async () => {
    const node = new SharePostRedditNode({
      nodeId: "share-post-reddit",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        integrationId: "test-integration",
        title: "Test Post",
        kind: "self",
        text: "content",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Subreddit is required");
  });

  it("should return error for missing title", async () => {
    const node = new SharePostRedditNode({
      nodeId: "share-post-reddit",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        integrationId: "test-integration",
        subreddit: "test",
        kind: "self",
        text: "content",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Title is required");
  });

  it("should return error for invalid kind", async () => {
    const node = new SharePostRedditNode({
      nodeId: "share-post-reddit",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        integrationId: "test-integration",
        subreddit: "test",
        title: "Test Post",
        kind: "invalid",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("must be 'self', 'link', or 'image'");
  });

  it("should return error for self post without text", async () => {
    const node = new SharePostRedditNode({
      nodeId: "share-post-reddit",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        integrationId: "test-integration",
        subreddit: "test",
        title: "Test Post",
        kind: "self",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Text is required for self posts");
  });

  it("should return error for link post without url", async () => {
    const node = new SharePostRedditNode({
      nodeId: "share-post-reddit",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        integrationId: "test-integration",
        subreddit: "test",
        title: "Test Post",
        kind: "link",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("URL is required for link posts");
  });

  it("should return error for image post without image", async () => {
    const node = new SharePostRedditNode({
      nodeId: "share-post-reddit",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        integrationId: "test-integration",
        subreddit: "test",
        title: "Test Post",
        kind: "image",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Image is required for image posts");
  });
});
