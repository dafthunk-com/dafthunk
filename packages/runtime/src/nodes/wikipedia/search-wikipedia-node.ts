import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * Wikipedia Search node implementation
 * Searches Wikipedia articles using the MediaWiki action API
 */
export class SearchWikipediaNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "search-wikipedia",
    name: "Search (Wikipedia)",
    type: "search-wikipedia",
    description: "Search Wikipedia articles by keyword or query",
    tags: ["Search", "Wikipedia", "Knowledge"],
    icon: "search",
    documentation:
      "This node searches Wikipedia for articles matching a query using the MediaWiki action API. Returns article titles, snippets, page IDs, and metadata. No API key required.",
    usage: 10,
    asTool: true,
    inputs: [
      {
        name: "query",
        type: "string",
        description: "Search query",
        required: true,
      },
      {
        name: "language",
        type: "string",
        description:
          "Wikipedia language code (e.g., en, fr, de, es, ja). Defaults to en.",
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
      const { query, language, limit, offset } = context.inputs;

      if (!query || typeof query !== "string") {
        return this.createErrorResult("Search query is required");
      }

      const lang =
        language && typeof language === "string" ? language.trim() : "en";

      if (!/^[a-z]{2,3}(-[a-z]+)?$/i.test(lang)) {
        return this.createErrorResult(
          "Invalid language code. Use a valid Wikipedia language code (e.g., en, fr, de)."
        );
      }

      const url = new URL(`https://${lang}.wikipedia.org/w/api.php`);
      url.searchParams.set("action", "query");
      url.searchParams.set("list", "search");
      url.searchParams.set("srsearch", query);
      url.searchParams.set("format", "json");
      url.searchParams.set(
        "srprop",
        "snippet|titlesnippet|timestamp|size|wordcount"
      );
      url.searchParams.set("srinfo", "totalhits|suggestion");

      if (limit && typeof limit === "number") {
        url.searchParams.set(
          "srlimit",
          Math.min(50, Math.max(1, limit)).toString()
        );
      } else {
        url.searchParams.set("srlimit", "10");
      }

      if (offset && typeof offset === "number" && offset > 0) {
        url.searchParams.set("sroffset", offset.toString());
      }

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "User-Agent": "Dafthunk/1.0",
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        return this.createErrorResult(
          `Wikipedia API request failed with status ${response.status}`
        );
      }

      const data = (await response.json()) as {
        query: {
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
      };

      const results = data.query.search.map((item) => ({
        title: item.title,
        pageId: item.pageid,
        snippet: item.snippet.replace(/<[^>]*>/g, ""),
        url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, "_"))}`,
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
          : "Unknown error searching Wikipedia"
      );
    }
  }
}
