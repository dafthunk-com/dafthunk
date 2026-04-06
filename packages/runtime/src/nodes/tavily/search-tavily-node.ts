import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  raw_content?: string;
}

interface TavilySearchResponse {
  query: string;
  answer?: string;
  results: TavilySearchResult[];
  response_time: number;
}

export class SearchTavilyNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "search-tavily",
    name: "Search (Tavily)",
    type: "search-tavily",
    description: "Search the web using Tavily AI search engine",
    tags: ["Search", "Web", "Tavily"],
    icon: "search",
    documentation:
      "Search the web using the Tavily API. Returns relevant search results with titles, URLs, and content snippets. Optionally generates an AI-powered answer to the query.",
    usage: 10,
    subscription: true,
    asTool: true,
    inputs: [
      {
        name: "query",
        type: "string",
        description: "Search query",
        required: true,
      },
      {
        name: "searchDepth",
        type: "string",
        description:
          "Search depth: basic (faster, 1 credit) or advanced (more relevant, 2 credits). Defaults to basic.",
        required: false,
        hidden: true,
      },
      {
        name: "maxResults",
        type: "number",
        description: "Maximum number of results (1-20, default 5)",
        required: false,
        hidden: true,
      },
      {
        name: "topic",
        type: "string",
        description: "Result category: general or news. Defaults to general.",
        required: false,
        hidden: true,
      },
      {
        name: "timeRange",
        type: "string",
        description: "Filter results by time: day, week, month, or year",
        required: false,
        hidden: true,
      },
      {
        name: "includeAnswer",
        type: "boolean",
        description:
          "Include an AI-generated answer to the query. Defaults to false.",
        required: false,
        hidden: true,
      },
      {
        name: "includeDomains",
        type: "json",
        description:
          'Array of domains to restrict results to (e.g. ["wikipedia.org", "github.com"])',
        required: false,
        hidden: true,
      },
      {
        name: "excludeDomains",
        type: "json",
        description:
          'Array of domains to exclude from results (e.g. ["reddit.com"])',
        required: false,
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "results",
        type: "json",
        description:
          "Array of search result objects with title, url, content, and score",
      },
      {
        name: "answer",
        type: "string",
        description:
          "AI-generated answer to the query (if includeAnswer is true)",
      },
      {
        name: "count",
        type: "number",
        description: "Number of results returned",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const {
        query,
        searchDepth,
        maxResults,
        topic,
        timeRange,
        includeAnswer,
        includeDomains,
        excludeDomains,
      } = context.inputs;

      if (query === null || query === undefined) {
        return this.createErrorResult("Missing required input: query");
      }

      if (typeof query !== "string") {
        return this.createErrorResult(
          `Invalid input type for query: expected string, got ${typeof query}`
        );
      }

      const { TAVILY_API_KEY } = context.env;
      if (!TAVILY_API_KEY) {
        return this.createErrorResult(
          "TAVILY_API_KEY environment variable is not configured"
        );
      }

      const body: Record<string, unknown> = { query };

      if (searchDepth && typeof searchDepth === "string") {
        body.search_depth = searchDepth;
      }
      if (maxResults && typeof maxResults === "number") {
        body.max_results = Math.min(20, Math.max(1, maxResults));
      }
      if (topic && typeof topic === "string") {
        body.topic = topic;
      }
      if (timeRange && typeof timeRange === "string") {
        body.time_range = timeRange;
      }
      if (includeAnswer) {
        body.include_answer = true;
      }
      if (Array.isArray(includeDomains) && includeDomains.length > 0) {
        body.include_domains = includeDomains;
      }
      if (Array.isArray(excludeDomains) && excludeDomains.length > 0) {
        body.exclude_domains = excludeDomains;
      }

      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TAVILY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        return this.createErrorResult(
          `Tavily API request failed with status ${response.status}`
        );
      }

      const data = (await response.json()) as TavilySearchResponse;

      const results = data.results.map((item) => ({
        title: item.title,
        url: item.url,
        content: item.content,
        score: item.score,
      }));

      return this.createSuccessResult({
        results,
        answer: data.answer ?? null,
        count: results.length,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(`Error in SearchTavily: ${error.message}`);
    }
  }
}
