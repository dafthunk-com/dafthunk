import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CommentOnPostInstagramNode } from "./comment-on-post-instagram-node";

global.fetch = vi.fn();

const nodeId = "comment-on-post-instagram";

const jsonResponse = (body: unknown, ok = true) => ({
  ok,
  json: vi.fn().mockResolvedValue(body),
  text: vi.fn().mockResolvedValue(JSON.stringify(body)),
});

const createContext = (inputs: Record<string, unknown>) =>
  ({
    nodeId,
    inputs,
    organizationId: "org-1",
    getIntegration: vi.fn().mockResolvedValue({ token: "test-token" }),
  }) as unknown as NodeContext;

const node = () =>
  new CommentOnPostInstagramNode({ nodeId } as unknown as Node);

describe("CommentOnPostInstagramNode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("posts a comment and returns its id", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      jsonResponse({ id: "comment-1" }) as never
    );

    const result = await node().execute(
      createContext({ integrationId: "i-1", postId: "media-1", text: "hello" })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.id).toBe("comment-1");

    const [url, init] = vi.mocked(global.fetch).mock.calls[0];
    expect(url).toBe("https://graph.instagram.com/v23.0/media-1/comments");
    expect(init?.method).toBe("POST");
    expect((init?.body as URLSearchParams).get("message")).toBe("hello");
  });

  it("rejects an over-limit comment before any API call", async () => {
    const result = await node().execute(
      createContext({
        integrationId: "i-1",
        postId: "media-1",
        text: "a".repeat(2201),
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("limit of 2200");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("requires comment text", async () => {
    const result = await node().execute(
      createContext({ integrationId: "i-1", postId: "media-1" })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Comment text is required");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("surfaces the Graph API error message", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      jsonResponse(
        { error: { error_user_msg: "Comments are limited" } },
        false
      ) as never
    );

    const result = await node().execute(
      createContext({ integrationId: "i-1", postId: "media-1", text: "hi" })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Comments are limited");
  });
});
