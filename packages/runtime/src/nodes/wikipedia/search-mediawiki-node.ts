import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * MediaWiki Search node implementation
 * Searches any MediaWiki instance using the action API
 */
export class SearchMediaWikiNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "search-mediawiki",
    name: "Search (MediaWiki)",
    type: "search-mediawiki",
    description: "Search any MediaWiki instance by keyword or query",
    tags: ["Search", "MediaWiki", "Wiki", "Knowledge"],
    icon: "search",
    documentation:
      "This node searches any MediaWiki-powered wiki using the action API. Provide the base URL of the wiki (e.g., https://en.wikipedia.org or https://wiki.example.com). Returns article titles, snippets, page IDs, and metadata. No API key required for most public wikis.",
    usage: 10,
    asTool: true,
    inputs: [
      {
        name: "baseUrl",
        type: "string",
        description:
          "Base URL of the MediaWiki instance (e.g., https://en.wikipedia.org)",
        required: false,
        hidden: true,
        value: "https://en.wikipedia.org",
      },
      {
        name: "query",
        type: "string",
        description: "Search query",
        required: true,
      },
      {
        name: "namespace",
        type: "number",
        description:
          "Namespace to search in (0 = articles, 1 = talk, etc.). Defaults to 0.",
        required: false,
        hidden: true,
      },
      {
        name: "limit",
        type: "number",
        description: "Number of results to retrieve (1-50, default 10)",
        required: false,
        hidden: true,
      },
      {
        name: "offset",
        type: "number",
        description: "Result offset for pagination (default 0)",
        required: false,
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "results",
        type: "json",
        description: "Array of search result objects",
        hidden: false,
      },
      {
        name: "totalHits",
        type: "number",
        description: "Total number of matching articles",
        hidden: false,
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
      const { baseUrl, query, namespace, limit, offset } = context.inputs;

      if (!baseUrl || typeof baseUrl !== "string") {
        return this.createErrorResult(
          "Base URL is required (e.g., https://en.wikipedia.org)"
        );
      }

      if (!query || typeof query !== "string") {
        return this.createErrorResult("Search query is required");
      }

      let apiUrl: URL;
      try {
        const base = baseUrl.replace(/\/+$/, "");
        apiUrl = new URL(`${base}/w/api.php`);
      } catch {
        return this.createErrorResult(
          "Invalid base URL. Provide a valid URL (e.g., https://en.wikipedia.org)."
        );
      }

      apiUrl.searchParams.set("action", "query");
      apiUrl.searchParams.set("list", "search");
      apiUrl.searchParams.set("srsearch", query);
      apiUrl.searchParams.set("format", "json");
      apiUrl.searchParams.set(
        "srprop",
        "snippet|titlesnippet|timestamp|size|wordcount"
      );
      apiUrl.searchParams.set("srinfo", "totalhits|suggestion");

      if (
        namespace !== undefined &&
        namespace !== null &&
        typeof namespace === "number"
      ) {
        apiUrl.searchParams.set("srnamespace", namespace.toString());
      }

      if (limit && typeof limit === "number") {
        apiUrl.searchParams.set(
          "srlimit",
          Math.min(50, Math.max(1, limit)).toString()
        );
      } else {
        apiUrl.searchParams.set("srlimit", "10");
      }

      if (offset && typeof offset === "number" && offset > 0) {
        apiUrl.searchParams.set("sroffset", offset.toString());
      }

      const response = await fetch(apiUrl.toString(), {
        method: "GET",
        headers: {
          "User-Agent": "Dafthunk/1.0",
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        return this.createErrorResult(
          `MediaWiki API request failed with status ${response.status}`
        );
      }

      const data = (await response.json()) as {
        query?: {
          searchinfo: {
            totalhits: number;
            suggestion?: string;
          };
          search: Array<{
            ns: number;
            title: string;
            pageid: number;
            size: number;
            wordcount: number;
            snippet: string;
            timestamp: string;
          }>;
        };
        error?: {
          code: string;
          info: string;
        };
      };

      if (data.error) {
        return this.createErrorResult(
          `MediaWiki API error: ${data.error.info}`
        );
      }

      if (!data.query) {
        return this.createErrorResult(
          "Unexpected response from MediaWiki API: no query results"
        );
      }

      const normalizedBase = baseUrl.replace(/\/+$/, "");

      const results = data.query.search.map((item) => ({
        title: item.title,
        pageId: item.pageid,
        snippet: item.snippet.replace(/<[^>]*>/g, ""),
        url: `${normalizedBase}/wiki/${encodeURIComponent(item.title.replace(/ /g, "_"))}`,
        size: item.size,
        wordCount: item.wordcount,
        timestamp: item.timestamp,
      }));

      return this.createSuccessResult({
        results,
        totalHits: data.query.searchinfo.totalhits,
        count: results.length,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error searching MediaWiki"
      );
    }
  }
}
