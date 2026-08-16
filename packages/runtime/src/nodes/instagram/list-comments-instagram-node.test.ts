import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ListCommentsInstagramNode } from "./list-comments-instagram-node";

global.fetch = vi.fn();

const nodeId = "list-comments-instagram";

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

const node = () => new ListCommentsInstagramNode({ nodeId } as unknown as Node);

describe("ListCommentsInstagramNode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists comments with the requested fields", async () => {
    const comments = [
      { id: "c-1", text: "nice", username: "someone", like_count: 2 },
      { id: "c-2", text: "wow", username: "other", like_count: 0 },
    ];
    vi.mocked(global.fetch).mockResolvedValueOnce(
      jsonResponse({ data: comments }) as never
    );

    const result = await node().execute(
      createContext({ integrationId: "i-1", postId: "media-1" })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.comments).toEqual(comments);
    expect(result.outputs?.count).toBe(2);

    const url = new URL(vi.mocked(global.fetch).mock.calls[0][0] as string);
    expect(url.pathname).toBe("/v23.0/media-1/comments");
    expect(url.searchParams.get("fields")).toBe(
      "id,text,timestamp,username,like_count,parent_id"
    );
    expect(url.searchParams.get("limit")).toBe("25");
  });

  it("clamps the limit into Instagram's accepted range", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      jsonResponse({ data: [] }) as never
    );

    const result = await node().execute(
      createContext({ integrationId: "i-1", postId: "media-1", limit: 500 })
    );

    expect(result.status).toBe("completed");
    const url = new URL(vi.mocked(global.fetch).mock.calls[0][0] as string);
    expect(url.searchParams.get("limit")).toBe("100");
  });

  it("surfaces the Graph API error message", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      jsonResponse(
        { error: { message: "Unsupported request" } },
        false
      ) as never
    );

    const result = await node().execute(
      createContext({ integrationId: "i-1", postId: "media-1" })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Unsupported request");
  });

  it("requires a post id", async () => {
    const result = await node().execute(
      createContext({ integrationId: "i-1" })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Post ID is required");
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
