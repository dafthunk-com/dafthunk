import { NodeExecution, NodeType } from "@dafthunk/types";

import { createDatabase, getDataset } from "../../db";
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
    tags: ["AI"],
    icon: "search",
    documentation: `This node searches through datasets using RAG (Retrieval-Augmented Generation) to find relevant content based on a query.

## Usage Example

- **Input**: \`"What are the benefits of machine learning?"\`
- **Output**: 
\`\`\`
{
  "searchResults": [
    {
      "content": "Machine learning provides automated pattern recognition...",
      "score": 0.85,
      "metadata": {...}
    }
  ],
  "searchQuery": "What are the benefits of machine learning?",
  "hasMore": false
}
\`\`\`

The node searches through your dataset and returns the most relevant content without generating AI responses.`,
    computeCost: 10,
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

      // Verify dataset exists and belongs to organization
      const db = createDatabase(context.env.DB);
      const dataset = await getDataset(db, datasetId, organizationId);
      if (!dataset) {
        return this.createErrorResult("Dataset not found or access denied");
      }

      // Create multi-tenant folder filter
      const folderPrefix = `${datasetId}/`;

      // Prepare AutoRAG search parameters - only include defined values
      const searchParams: any = {
        query: query.trim(),
      };

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

      // Only set filters if we have a valid folder prefix
      if (folderPrefix) {
        searchParams.filters = {
          type: "eq" as const,
          key: "folder",
          value: folderPrefix,
        };
      }

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
