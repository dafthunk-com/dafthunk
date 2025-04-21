import { ExecutableNode } from "../types";
import { NodeContext } from "../types";
import { NodeType, NodeExecution } from "@dafthunk/types";

/**
 * Text reranking node implementation using BGE Reranker Base model
 */
export class BgeRerankerBaseNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "bge-reranker-base",
    name: "BGE Reranker Base",
    type: "bge-reranker-base",
    description:
      "Reranks text passages based on their relevance to a query using BGE Reranker Base model",
    category: "Text",
    icon: "search",
    inputs: [
      {
        name: "query",
        type: "string",
        description: "The query to rank the contexts against",
        required: true,
      },
      {
        name: "contexts",
        type: "array",
        description: "Array of text passages to rank",
        required: true,
      },
      {
        name: "topK",
        type: "number",
        description: "Number of top results to return (optional)",
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "rankings",
        type: "array",
        description: "Array of ranked results with scores",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { query, contexts, topK } = context.inputs;

      if (!context.env?.AI) {
        return this.createErrorResult("AI service is not available");
      }

      const formattedContexts = contexts.map((text: any) => ({ text }));

      const result = await context.env.AI.run("@cf/baai/bge-reranker-base", {
        query,
        contexts: formattedContexts,
        ...(topK && { top_k: topK }),
      });

      // Map the results to include the original text
      const rankings = result.response?.map((item: any) => ({
        id: item.id,
        score: item.score,
        text: contexts[item.id],
      }));

      return this.createSuccessResult({
        rankings,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
}
