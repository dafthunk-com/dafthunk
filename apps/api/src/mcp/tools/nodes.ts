import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CloudflareNodeRegistry } from "../../nodes/cloudflare-node-registry";
import type { McpContext } from "../index";

/**
 * Simplified node type for LLM consumption
 */
interface LlmNodeSummary {
  type: string;
  name: string;
  category: string;
  description: string;
}

/**
 * Full node schema for LLM consumption
 */
interface LlmNodeSchema {
  type: string;
  name: string;
  category: string;
  description: string;
  inputs: {
    name: string;
    type: string;
    required: boolean;
    description?: string;
  }[];
  outputs: {
    name: string;
    type: string;
    description?: string;
  }[];
}

/**
 * Extract the primary category from node tags
 */
function extractCategory(tags: string[]): string {
  if (tags.length === 0) return "Other";
  // First tag is typically the primary category
  return tags[0];
}

/**
 * Register node discovery tools
 */
export function registerNodeTools(
  server: McpServer,
  context: McpContext
): void {
  // list_node_categories - Get all categories with node counts
  server.registerTool(
    "list_node_categories",
    {
      description:
        "Get all node categories with counts. Returns categories like 'AI', 'Image', 'Text', etc. with the number of nodes in each.",
    },
    async () => {
      const registry = new CloudflareNodeRegistry(context.env, false);
      const nodeTypes = registry.getNodeTypes();

      // Group by category
      const categories: Record<string, number> = {};
      for (const nodeType of nodeTypes) {
        const category = extractCategory(nodeType.tags);
        categories[category] = (categories[category] || 0) + 1;
      }

      // Sort by count descending
      const sortedCategories = Object.entries(categories)
        .sort((a, b) => b[1] - a[1])
        .reduce(
          (acc, [key, value]) => {
            acc[key] = value;
            return acc;
          },
          {} as Record<string, number>
        );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(sortedCategories, null, 2),
          },
        ],
      };
    }
  );

  // search_nodes - Search nodes by name/description/tags
  server.registerTool(
    "search_nodes",
    {
      description:
        "Search for nodes by name, description, or category. Returns summaries of matching nodes. Use this to find nodes for your workflow.",
      inputSchema: {
        query: z
          .string()
          .describe("Search query (e.g., 'image resize', 'claude', 'text')"),
        category: z
          .string()
          .optional()
          .describe("Optional category filter (e.g., 'AI', 'Image')"),
        limit: z
          .number()
          .optional()
          .default(20)
          .describe("Maximum results to return (default: 20)"),
      },
    },
    async ({ query, category, limit }) => {
      const registry = new CloudflareNodeRegistry(context.env, false);
      const nodeTypes = registry.getNodeTypes();

      const queryLower = query.toLowerCase();

      // Filter nodes matching the query
      let matches = nodeTypes.filter((nodeType) => {
        const nameMatch = nodeType.name.toLowerCase().includes(queryLower);
        const typeMatch = nodeType.type.toLowerCase().includes(queryLower);
        const descMatch = nodeType.description
          ?.toLowerCase()
          .includes(queryLower);
        const tagMatch = nodeType.tags.some((tag) =>
          tag.toLowerCase().includes(queryLower)
        );

        return nameMatch || typeMatch || descMatch || tagMatch;
      });

      // Apply category filter if specified
      if (category) {
        const categoryLower = category.toLowerCase();
        matches = matches.filter((nodeType) =>
          nodeType.tags.some((tag) => tag.toLowerCase() === categoryLower)
        );
      }

      // Limit results
      matches = matches.slice(0, limit);

      // Convert to LLM-friendly format
      const summaries: LlmNodeSummary[] = matches.map((nodeType) => ({
        type: nodeType.type,
        name: nodeType.name,
        category: extractCategory(nodeType.tags),
        description: nodeType.description || "",
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(summaries, null, 2),
          },
        ],
      };
    }
  );

  // get_node_schema - Get full schema for a specific node type
  server.registerTool(
    "get_node_schema",
    {
      description:
        "Get the full schema for a specific node type including all inputs and outputs. Use the 'type' value from search_nodes results.",
      inputSchema: {
        nodeType: z
          .string()
          .describe("The node type (e.g., 'claude-sonnet-4', 'photon-resize')"),
      },
    },
    async ({ nodeType }) => {
      const registry = new CloudflareNodeRegistry(context.env, false);

      try {
        const nodeTypeDef = registry.getNodeType(nodeType);

        const schema: LlmNodeSchema = {
          type: nodeTypeDef.type,
          name: nodeTypeDef.name,
          category: extractCategory(nodeTypeDef.tags),
          description: nodeTypeDef.description || "",
          inputs: nodeTypeDef.inputs.map((input) => ({
            name: input.name,
            type: input.type,
            required: input.required ?? false,
            description: input.description,
          })),
          outputs: nodeTypeDef.outputs.map((output) => ({
            name: output.name,
            type: output.type,
            description: output.description,
          })),
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(schema, null, 2),
            },
          ],
        };
      } catch {
        return {
          content: [
            {
              type: "text",
              text: `Error: Node type '${nodeType}' not found. Use search_nodes to find available node types.`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
