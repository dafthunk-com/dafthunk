import type { NodeContext } from "@dafthunk/runtime";
import type { Node } from "@dafthunk/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SearchTavilyNode } from "./search-tavily-node";

global.fetch = vi.fn();

describe("SearchTavilyNode", () => {
  beforeEach(() => vi.clearAllMocks());

  const createContext = (
    inputs: Record<string, unknown>,
    env: Record<string, string> = {}
  ): NodeContext =>
    ({
      nodeId: "search-tavily",
      inputs,
      organizationId: "test-org",
      env,
    }) as unknown as NodeContext;

  const createNode = () =>
    new SearchTavilyNode({
      nodeId: "search-tavily",
    } as unknown as Node);

  it("should return error for missing query", async () => {
    const result = await createNode().execute(
      createContext({}, { TAVILY_API_KEY: "tvly-test" })
    );
    expect(result.status).toBe("error");
    expect(result.error).toContain("Missing required input: query");
  });

  it("should return error for invalid query type", async () => {
    const result = await createNode().execute(
      createContext({ query: 123 }, { TAVILY_API_KEY: "tvly-test" })
    );
    expect(result.status).toBe("error");
    expect(result.error).toContain("Invalid input type for query");
  });

  it("should return error for missing API key", async () => {
    const result = await createNode().execute(createContext({ query: "test" }));
    expect(result.status).toBe("error");
    expect(result.error).toContain("TAVILY_API_KEY");
  });

  it("should return search results", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        query: "test query",
        results: [
          {
            title: "Test Result",
            url: "https://example.com",
            content: "Test content snippet",
            score: 0.95,
          },
        ],
        response_time: 0.5,
      }),
    });

    const result = await createNode().execute(
      createContext({ query: "test query" }, { TAVILY_API_KEY: "tvly-test" })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.results).toEqual([
      {
        title: "Test Result",
        url: "https://example.com",
        content: "Test content snippet",
        score: 0.95,
      },
    ]);
    expect(result.outputs?.count).toBe(1);
    expect(result.outputs?.answer).toBeNull();
  });

  it("should include answer when requested", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        query: "what is typescript",
        answer: "TypeScript is a typed superset of JavaScript.",
        results: [],
        response_time: 0.3,
      }),
    });

    const result = await createNode().execute(
      createContext(
        { query: "what is typescript", includeAnswer: true },
        { TAVILY_API_KEY: "tvly-test" }
      )
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.answer).toBe(
      "TypeScript is a typed superset of JavaScript."
    );
  });

  it("should pass optional parameters in request body", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        query: "news",
        results: [],
        response_time: 0.2,
      }),
    });

    await createNode().execute(
      createContext(
        {
          query: "news",
          searchDepth: "advanced",
          maxResults: 10,
          topic: "news",
          timeRange: "week",
          includeDomains: ["reuters.com"],
          excludeDomains: ["reddit.com"],
        },
        { TAVILY_API_KEY: "tvly-test" }
      )
    );

    const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.query).toBe("news");
    expect(body.search_depth).toBe("advanced");
    expect(body.max_results).toBe(10);
    expect(body.topic).toBe("news");
    expect(body.time_range).toBe("week");
    expect(body.include_domains).toEqual(["reuters.com"]);
    expect(body.exclude_domains).toEqual(["reddit.com"]);
  });

  it("should handle API errors", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 429,
    });

    const result = await createNode().execute(
      createContext({ query: "test" }, { TAVILY_API_KEY: "tvly-test" })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("429");
  });
});
