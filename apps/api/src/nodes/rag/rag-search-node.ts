import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * RAG Search node implementation
 * This node provides a dataset selector widget and performs search
 * using Cloudflare's AutoRAG search() method with multi-tenant folder filtering.
 * Returns search results without AI-generated response.
 */
export class RagSearchNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "rag-search",
    name: "RAG Search",
    type: "rag-search",
    description: "Search through datasets and return relevant results",
    category: "AI",
    icon: "search",
    inputs: [
      {
        name: "query",
        type: "string",
        description: "The search query to find relevant content",
        required: true,
      },
      {
        name: "datasetId",
        type: "string",
        description: "Selected dataset ID for the search",
        hidden: true,
        required: true,
      },
      {
        name: "rewriteQuery",
        type: "boolean",
        description: "Rewrite query for better search optimization",
        hidden: true,
        value: true,
      },
      {
        name: "maxResults",
        type: "number",
        description: "Maximum number of results to return",
        hidden: true,
        value: 10,
      },
      {
        name: "scoreThreshold",
        type: "number",
        description: "Minimum match score for results",
        hidden: true,
        value: 0.3,
      },
    ],
    outputs: [
      {
        name: "searchResults",
        type: "json",
        description: "Search results from the dataset",
      },
      {
        name: "searchQuery",
        type: "string",
        description: "The processed search query that was used",
        hidden: true,
      },
      {
        name: "hasMore",
        type: "boolean",
        description: "Whether there are more results available",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { query, datasetId, rewriteQuery, maxResults, scoreThreshold } =
        context.inputs;

      const { organizationId } = context;

      // Validate required inputs
      if (!query || typeof query !== "string") {
        return this.createErrorResult("Query is required and must be a string");
      }

      if (!datasetId || typeof datasetId !== "string") {
        return this.createErrorResult("Dataset ID is required");
      }

      if (!organizationId || typeof organizationId !== "string") {
        return this.createErrorResult("Organization ID is required");
      }

      if (!context.env.AI) {
        return this.createErrorResult("AI binding is not available");
      }

      // Create multi-tenant folder filter
      const folderPrefix = `${organizationId}/${datasetId}/`;

      // Prepare AutoRAG search parameters
      const searchParams = {
        query: query.trim(),
        rewrite_query: Boolean(rewriteQuery),
        max_num_results: Math.min(Math.max(Number(maxResults) || 10, 1), 50),
        ranking_options: {
          score_threshold: Math.min(
            Math.max(Number(scoreThreshold) || 0.3, 0),
            1
          ),
        },
        filters: {
          type: "eq" as const,
          key: "folder",
          value: folderPrefix,
        },
      };

      // Execute AutoRAG search (search only, no generation)
      const autoragInstance = context.env.AI.autorag(
        context.env.DATASETS_AUTORAG
      );
      const result = await autoragInstance.search(searchParams);

      // Handle the response
      let searchResults = null;
      let searchQuery = "";
      let hasMore = false;

      if (result && typeof result === "object") {
        searchResults = (result as any).data || [];
        searchQuery = (result as any).search_query || query;
        hasMore = (result as any).has_more || false;
      }

      return this.createSuccessResult({
        searchResults,
        searchQuery,
        hasMore,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error during RAG search"
      );
    }
  }
}
