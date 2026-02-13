import { ExecutableNode, NodeContext } from "@dafthunk/runtime";
import { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * Dataset AI Search node implementation
 * This node provides a dataset selector widget and performs AI-powered search
 * using Cloudflare's AutoRAG with multi-tenant folder filtering.
 */
export class DatasetAiSearchNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "dataset-ai-search",
    name: "Dataset AI Search",
    type: "dataset-ai-search",
    description: "AI-powered search through datasets",
    tags: ["Widget", "AI", "Dataset", "Vector", "Search"],
    icon: "search",
    documentation:
      "This node performs AI-powered search through datasets using RAG (Retrieval-Augmented Generation) and generates intelligent responses.",
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
        name: "model",
        type: "string",
        description: "The text-generation model to use",
        hidden: true,
        value: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
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
        name: "response",
        type: "string",
        description: "The AI-generated response based on the search results",
      },
      {
        name: "searchResults",
        type: "json",
        description: "Raw search results from the dataset",
        hidden: true,
      },
      {
        name: "searchQuery",
        type: "string",
        description: "The processed search query that was used",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const {
        query,
        datasetId,
        model,
        rewriteQuery,
        maxResults,
        scoreThreshold,
      } = context.inputs;

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

      const result = await dataset.aiSearch(query, {
        model: model && typeof model === "string" ? model : undefined,
        rewriteQuery:
          rewriteQuery !== undefined ? Boolean(rewriteQuery) : undefined,
        maxResults: maxResults !== undefined ? Number(maxResults) : undefined,
        scoreThreshold:
          scoreThreshold !== undefined ? Number(scoreThreshold) : undefined,
      });

      return this.createSuccessResult({
        response: result.response,
        searchResults: result.results,
        searchQuery: result.searchQuery,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error during AutoRAG search"
      );
    }
  }
}
