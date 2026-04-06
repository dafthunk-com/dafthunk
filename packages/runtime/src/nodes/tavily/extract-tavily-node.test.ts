import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExtractTavilyNode } from "./extract-tavily-node";

global.fetch = vi.fn();

describe("ExtractTavilyNode", () => {
  beforeEach(() => vi.clearAllMocks());

  const createContext = (
    inputs: Record<string, unknown>,
    env: Record<string, string> = {}
  ): NodeContext =>
    ({
      nodeId: "extract-tavily",
      inputs,
      organizationId: "test-org",
      env,
    }) as unknown as NodeContext;

  const createNode = () =>
    new ExtractTavilyNode({
      nodeId: "extract-tavily",
    } as unknown as Node);

  it("should return error for missing urls", async () => {
    const result = await createNode().execute(
      createContext({}, { TAVILY_API_KEY: "tvly-test" })
    );
    expect(result.status).toBe("error");
    expect(result.error).toContain("Missing required input: urls");
  });

  it("should return error for invalid urls type", async () => {
    const result = await createNode().execute(
      createContext({ urls: 123 }, { TAVILY_API_KEY: "tvly-test" })
    );
    expect(result.status).toBe("error");
    expect(result.error).toContain("Invalid input type for urls");
  });

  it("should return error for missing API key", async () => {
    const result = await createNode().execute(
      createContext({ urls: ["https://example.com"] })
    );
    expect(result.status).toBe("error");
    expect(result.error).toContain("TAVILY_API_KEY");
  });

  it("should extract content from URLs", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            url: "https://example.com",
            raw_content: "# Example\nPage content here.",
          },
        ],
        failed_results: [],
        response_time: 1.2,
      }),
    });

    const result = await createNode().execute(
      createContext(
        { urls: ["https://example.com"] },
        { TAVILY_API_KEY: "tvly-test" }
      )
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.results).toEqual([
      {
        url: "https://example.com",
        content: "# Example\nPage content here.",
      },
    ]);
    expect(result.outputs?.count).toBe(1);
    expect(result.outputs?.failedResults).toEqual([]);
  });

  it("should accept a single URL string", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [{ url: "https://example.com", raw_content: "Content" }],
        failed_results: [],
        response_time: 0.5,
      }),
    });

    await createNode().execute(
      createContext(
        { urls: "https://example.com" },
        { TAVILY_API_KEY: "tvly-test" }
      )
    );

    const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.urls).toEqual(["https://example.com"]);
  });

  it("should report failed extractions", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [],
        failed_results: [
          {
            url: "https://blocked.com",
            error: "Access denied",
          },
        ],
        response_time: 0.8,
      }),
    });

    const result = await createNode().execute(
      createContext(
        { urls: ["https://blocked.com"] },
        { TAVILY_API_KEY: "tvly-test" }
      )
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.results).toEqual([]);
    expect(result.outputs?.failedResults).toEqual([
      { url: "https://blocked.com", error: "Access denied" },
    ]);
    expect(result.outputs?.count).toBe(0);
  });

  it("should handle API errors", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 401,
    });

    const result = await createNode().execute(
      createContext(
        { urls: ["https://example.com"] },
        { TAVILY_API_KEY: "tvly-bad-key" }
      )
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("401");
  });
});
