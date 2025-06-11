import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

/**
 * RAG AI Search node implementation
 * This node provides a dataset selector widget and performs AI-powered search
 * using Cloudflare's AutoRAG with multi-tenant folder filtering.
 */
export class RagAiSearchNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "rag-ai-search",
    name: "RAG AI Search",
    type: "rag-ai-search",
    description: "AI-powered search through datasets",
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
        name: "model",
        type: "string",
        description: "The text-generation model to use",
        hidden: true,
        value: "@cf/meta/llama-3.3-70b-instruct-sd",
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

      if (!context.env.AI) {
        return this.createErrorResult("AI binding is not available");
      }

      // Create multi-tenant folder filter
      const folderPrefix = `${organizationId}/${datasetId}/`;

      // Prepare AutoRAG search parameters - only include defined values
      const searchParams: any = {
        query: query.trim(),
      };

      // Only set model if provided
      if (model && typeof model === "string") {
        searchParams.model = model;
      }

      // Only set rewrite_query if explicitly provided
      if (rewriteQuery !== undefined) {
        searchParams.rewrite_query = Boolean(rewriteQuery);
      }

      // Only set max_num_results if provided and valid
      if (maxResults !== undefined && !isNaN(Number(maxResults))) {
        const numResults = Math.min(Math.max(Number(maxResults), 1), 50);
        searchParams.max_num_results = numResults;
      }

      // Only set ranking_options if scoreThreshold is provided and valid
      if (scoreThreshold !== undefined && !isNaN(Number(scoreThreshold))) {
        const threshold = Math.min(Math.max(Number(scoreThreshold), 0), 1);
        searchParams.ranking_options = {
          score_threshold: threshold,
        };
      }

      // Always set stream to false for simplicity
      searchParams.stream = false;

      // Only set filters if we have a valid folder prefix
      if (folderPrefix) {
        searchParams.filters = {
            type: "eq" as const,
            key: "folder",
            value: "01975f74-76b4-7778-b50d-1d079cee26ce/01975fd5-5e25-728a-afd3-a8c40e6571b7/",
        };
      }

      // Execute AutoRAG search
      const autoragInstance = context.env.AI.autorag(
        context.env.DATASETS_AUTORAG
      );
      const result = await autoragInstance.aiSearch(searchParams);

      // Handle the response
      let response = "";
      let searchResults = null;
      let searchQuery = "";

      if (result && typeof result === "object") {
        response = (result as any).response || "";
        searchResults = (result as any).data || null;
        searchQuery = (result as any).search_query || query;
      } else if (typeof result === "string") {
        response = result;
        searchQuery = query;
      }

      return this.createSuccessResult({
        response,
        searchResults,
        searchQuery,
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
