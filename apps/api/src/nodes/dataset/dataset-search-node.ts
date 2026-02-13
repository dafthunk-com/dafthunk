import { ExecutableNode, NodeContext } from "@dafthunk/runtime";
import { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * Dataset Search node implementation
 * This node provides a dataset selector widget and performs search
 * using Cloudflare's AutoRAG search() method with multi-tenant folder filtering.
 * Returns search results without AI-generated response.
 */
export class DatasetSearchNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "dataset-search",
    name: "Dataset Search",
    type: "dataset-search",
    description: "Search through datasets and return relevant results",
    tags: ["Widget", "AI", "Dataset", "Vector", "Search"],
    icon: "search",
    documentation:
      "This node searches through datasets using RAG (Retrieval-Augmented Generation) to find relevant content based on a query.",
    usage: 10,
    asTool: true,
    inputs: [
      {
        name: "query",
        type: "string",
        description: "The search query to find relevant content",
        required: true,
      },
      {
        name: "datasetId",
        type: "dataset",
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

      if (!context.datasetService) {
        return this.createErrorResult("Dataset service not available");
      }
      const dataset = await context.datasetService.resolve(
        datasetId,
        organizationId
      );
      if (!dataset) {
        return this.createErrorResult("Dataset not found or access denied");
      }

      const result = await dataset.search(query, {
        rewriteQuery:
          rewriteQuery !== undefined ? Boolean(rewriteQuery) : undefined,
        maxResults: maxResults !== undefined ? Number(maxResults) : undefined,
        scoreThreshold:
          scoreThreshold !== undefined ? Number(scoreThreshold) : undefined,
      });

      return this.createSuccessResult({
        searchResults: result.results,
        searchQuery: result.searchQuery,
        hasMore: result.hasMore,
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
