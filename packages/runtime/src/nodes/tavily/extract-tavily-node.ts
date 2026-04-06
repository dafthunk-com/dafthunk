import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

interface TavilyExtractResult {
  url: string;
  raw_content: string;
}

interface TavilyExtractFailedResult {
  url: string;
  error: string;
}

interface TavilyExtractResponse {
  results: TavilyExtractResult[];
  failed_results: TavilyExtractFailedResult[];
  response_time: number;
}

export class ExtractTavilyNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "extract-tavily",
    name: "Extract (Tavily)",
    type: "extract-tavily",
    description: "Extract content from web pages using Tavily",
    tags: ["Extract", "Web", "Tavily"],
    icon: "file-text",
    documentation:
      "Extract clean, structured content from one or more web pages using the Tavily Extract API. Returns the page content in markdown or text format.",
    usage: 10,
    asTool: true,
    inputs: [
      {
        name: "urls",
        type: "json",
        description: "URL string or array of URLs to extract content from",
        required: true,
      },
      {
        name: "extractDepth",
        type: "string",
        description:
          "Extraction depth: basic (1 credit per 5) or advanced (2 credits per 5). Defaults to basic.",
        required: false,
        hidden: true,
      },
      {
        name: "format",
        type: "string",
        description: "Output format: markdown or text. Defaults to markdown.",
        required: false,
        hidden: true,
      },
      {
        name: "includeImages",
        type: "boolean",
        description: "Include extracted image URLs. Defaults to false.",
        required: false,
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "results",
        type: "json",
        description: "Array of extracted content objects with url and content",
      },
      {
        name: "failedResults",
        type: "json",
        description: "Array of URLs that failed to extract with error messages",
        hidden: true,
      },
      {
        name: "count",
        type: "number",
        description: "Number of successfully extracted pages",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { urls, extractDepth, format, includeImages } = context.inputs;

      if (urls === null || urls === undefined) {
        return this.createErrorResult("Missing required input: urls");
      }

      const urlList = typeof urls === "string" ? [urls] : urls;
      if (!Array.isArray(urlList) || urlList.length === 0) {
        return this.createErrorResult(
          `Invalid input type for urls: expected string or non-empty array of strings, got ${typeof urls}`
        );
      }

      const { TAVILY_API_KEY } = context.env;
      if (!TAVILY_API_KEY) {
        return this.createErrorResult(
          "TAVILY_API_KEY environment variable is not configured"
        );
      }

      const body: Record<string, unknown> = { urls: urlList };

      if (extractDepth && typeof extractDepth === "string") {
        body.extract_depth = extractDepth;
      }
      if (format && typeof format === "string") {
        body.format = format;
      }
      if (includeImages) {
        body.include_images = true;
      }

      const response = await fetch("https://api.tavily.com/extract", {
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

      const data = (await response.json()) as TavilyExtractResponse;

      const results = data.results.map((item) => ({
        url: item.url,
        content: item.raw_content,
      }));

      const failedResults = data.failed_results.map((item) => ({
        url: item.url,
        error: item.error,
      }));

      return this.createSuccessResult({
        results,
        failedResults,
        count: results.length,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(`Error in ExtractTavily: ${error.message}`);
    }
  }
}
