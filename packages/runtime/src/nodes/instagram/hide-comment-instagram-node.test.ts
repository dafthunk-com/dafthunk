import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HideCommentInstagramNode } from "./hide-comment-instagram-node";

global.fetch = vi.fn();

const nodeId = "hide-comment-instagram";

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

const node = () => new HideCommentInstagramNode({ nodeId } as unknown as Node);

describe("HideCommentInstagramNode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hides a comment by default", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      jsonResponse({ success: true }) as never
    );

    const result = await node().execute(
      createContext({ integrationId: "i-1", commentId: "comment-1" })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.success).toBe(true);

    const [url, init] = vi.mocked(global.fetch).mock.calls[0];
    expect(url).toBe("https://graph.instagram.com/v23.0/comment-1");
    expect(init?.method).toBe("POST");
    expect((init?.body as URLSearchParams).get("hide")).toBe("true");
  });

  it("unhides when hide is false", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      jsonResponse({ success: true }) as never
    );

    const result = await node().execute(
      createContext({
        integrationId: "i-1",
        commentId: "comment-1",
        hide: false,
      })
    );

    expect(result.status).toBe("completed");
    expect(
      (vi.mocked(global.fetch).mock.calls[0][1]?.body as URLSearchParams).get(
        "hide"
      )
    ).toBe("false");
  });

  it("surfaces the Graph API error message", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      jsonResponse({ error: { message: "Cannot hide reply" } }, false) as never
    );

    const result = await node().execute(
      createContext({ integrationId: "i-1", commentId: "comment-1" })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Cannot hide reply");
  });
});
