import type { Edge, Node, Parameter } from "@dafthunk/types";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { v7 as uuid } from "uuid";
import { z } from "zod";
import { CloudflareNodeRegistry } from "../../nodes/cloudflare-node-registry";
import { WorkflowStore } from "../../stores/workflow-store";
import type { McpContext } from "../index";

/**
 * Register workflow building tools
 */
export function registerBuildingTools(
  server: McpServer,
  context: McpContext
): void {
  // add_node - Add a node to a workflow
  server.registerTool(
    "add_node",
    {
      description:
        "Add a node to a workflow. Use get_node_schema first to see required inputs.",
      inputSchema: {
        workflowId: z.string().describe("The workflow ID"),
        nodeType: z
          .string()
          .describe("The node type (e.g., 'claude-sonnet-4')"),
        name: z.string().optional().describe("Display name for the node"),
        position: z
          .object({
            x: z.number(),
            y: z.number(),
          })
          .optional()
          .describe("Position on canvas (auto-positioned if not specified)"),
        inputs: z
          .record(z.string(), z.unknown())
          .optional()
          .describe(
            'Input values as key-value pairs (e.g., {prompt: "Hello"})'
          ),
      },
    },
    async ({ workflowId, nodeType, name, position, inputs }) => {
      const workflowStore = new WorkflowStore(context.env);
      const registry = new CloudflareNodeRegistry(context.env, false);

      // Get workflow
      const workflow = await workflowStore.getWithData(
        workflowId,
        context.organizationId
      );
      if (!workflow) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Workflow '${workflowId}' not found.`,
            },
          ],
          isError: true,
        };
      }

      // Get node type definition
      let nodeTypeDef;
      try {
        nodeTypeDef = registry.getNodeType(nodeType);
      } catch {
        return {
          content: [
            {
              type: "text",
              text: `Error: Node type '${nodeType}' not found. Use search_nodes to find available types.`,
            },
          ],
          isError: true,
        };
      }

      // Generate node ID and position
      const nodeId = uuid();
      const existingNodes = workflow.data.nodes || [];
      const nodePosition = position || {
        x: 100 + existingNodes.length * 250,
        y: 100,
      };

      // Create inputs with values
      const nodeInputs: Parameter[] = nodeTypeDef.inputs.map((input) => {
        const value = inputs?.[input.name];
        return {
          ...input,
          value: value !== undefined ? value : input.value,
        } as Parameter;
      });

      // Create outputs
      const nodeOutputs: Parameter[] = nodeTypeDef.outputs.map((output) => ({
        ...output,
        value: undefined,
      })) as Parameter[];

      // Create the node
      const newNode: Node = {
        id: nodeId,
        name: name || nodeTypeDef.name,
        type: nodeType,
        icon: nodeTypeDef.icon,
        position: nodePosition,
        inputs: nodeInputs,
        outputs: nodeOutputs,
      };

      // Save updated workflow
      const updatedNodes = [...existingNodes, newNode];
      // Extract only the fields needed for save (exclude 'data' from getWithData result)
      const { data: _, ...workflowRecord } = workflow;
      await workflowStore.save({
        ...workflowRecord,
        organizationId: context.organizationId,
        nodes: updatedNodes,
        edges: workflow.data.edges || [],
        updatedAt: new Date(),
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                nodeId,
                name: newNode.name,
                type: nodeType,
                message:
                  "Node added successfully. Use connect_nodes to wire it to other nodes.",
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // connect_nodes - Create an edge between two nodes
  server.registerTool(
    "connect_nodes",
    {
      description:
        "Connect two nodes by creating an edge from a source output to a target input.",
      inputSchema: {
        workflowId: z.string().describe("The workflow ID"),
        sourceNodeId: z.string().describe("Source node ID"),
        sourceOutput: z
          .string()
          .describe("Name of the output on the source node"),
        targetNodeId: z.string().describe("Target node ID"),
        targetInput: z
          .string()
          .describe("Name of the input on the target node"),
      },
    },
    async ({
      workflowId,
      sourceNodeId,
      sourceOutput,
      targetNodeId,
      targetInput,
    }) => {
      const workflowStore = new WorkflowStore(context.env);

      // Get workflow
      const workflow = await workflowStore.getWithData(
        workflowId,
        context.organizationId
      );
      if (!workflow) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Workflow '${workflowId}' not found.`,
            },
          ],
          isError: true,
        };
      }

      const nodes = workflow.data.nodes || [];
      const edges = workflow.data.edges || [];

      // Validate source node exists
      const sourceNode = nodes.find((n: Node) => n.id === sourceNodeId);
      if (!sourceNode) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Source node '${sourceNodeId}' not found.`,
            },
          ],
          isError: true,
        };
      }

      // Validate target node exists
      const targetNode = nodes.find((n: Node) => n.id === targetNodeId);
      if (!targetNode) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Target node '${targetNodeId}' not found.`,
            },
          ],
          isError: true,
        };
      }

      // Validate source output exists
      const hasSourceOutput = sourceNode.outputs.some(
        (o: Parameter) => o.name === sourceOutput
      );
      if (!hasSourceOutput) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Source node does not have output '${sourceOutput}'. Available: ${sourceNode.outputs.map((o: Parameter) => o.name).join(", ")}`,
            },
          ],
          isError: true,
        };
      }

      // Validate target input exists
      const hasTargetInput = targetNode.inputs.some(
        (i: Parameter) => i.name === targetInput
      );
      if (!hasTargetInput) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Target node does not have input '${targetInput}'. Available: ${targetNode.inputs.map((i: Parameter) => i.name).join(", ")}`,
            },
          ],
          isError: true,
        };
      }

      // Check for duplicate edge
      const duplicateEdge = edges.find(
        (e: Edge) =>
          e.source === sourceNodeId &&
          e.target === targetNodeId &&
          e.sourceOutput === sourceOutput &&
          e.targetInput === targetInput
      );
      if (duplicateEdge) {
        return {
          content: [
            {
              type: "text",
              text: "Error: This connection already exists.",
            },
          ],
          isError: true,
        };
      }

      // Create the edge
      const newEdge: Edge = {
        source: sourceNodeId,
        target: targetNodeId,
        sourceOutput,
        targetInput,
      };

      // Save updated workflow
      const updatedEdges = [...edges, newEdge];
      // Extract only the fields needed for save (exclude 'data' from getWithData result)
      const { data: _, ...workflowRecord } = workflow;
      await workflowStore.save({
        ...workflowRecord,
        organizationId: context.organizationId,
        nodes,
        edges: updatedEdges,
        updatedAt: new Date(),
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                connection: {
                  source: `${sourceNode.name}.${sourceOutput}`,
                  target: `${targetNode.name}.${targetInput}`,
                },
                message: "Nodes connected successfully.",
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // remove_node - Remove a node and its edges from a workflow
  server.registerTool(
    "remove_node",
    {
      description:
        "Remove a node from a workflow. Also removes all edges connected to the node.",
      inputSchema: {
        workflowId: z.string().describe("The workflow ID"),
        nodeId: z.string().describe("The node ID to remove"),
      },
    },
    async ({ workflowId, nodeId }) => {
      const workflowStore = new WorkflowStore(context.env);

      // Get workflow
      const workflow = await workflowStore.getWithData(
        workflowId,
        context.organizationId
      );
      if (!workflow) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Workflow '${workflowId}' not found.`,
            },
          ],
          isError: true,
        };
      }

      const nodes = workflow.data.nodes || [];
      const edges = workflow.data.edges || [];

      // Find the node
      const nodeIndex = nodes.findIndex((n: Node) => n.id === nodeId);
      if (nodeIndex === -1) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Node '${nodeId}' not found.`,
            },
          ],
          isError: true,
        };
      }

      const removedNode = nodes[nodeIndex];

      // Remove the node
      const updatedNodes = nodes.filter((n: Node) => n.id !== nodeId);

      // Remove edges connected to this node
      const updatedEdges = edges.filter(
        (e: Edge) => e.source !== nodeId && e.target !== nodeId
      );

      const removedEdgesCount = edges.length - updatedEdges.length;

      // Save updated workflow
      // Extract only the fields needed for save (exclude 'data' from getWithData result)
      const { data: _, ...workflowRecord } = workflow;
      await workflowStore.save({
        ...workflowRecord,
        organizationId: context.organizationId,
        nodes: updatedNodes,
        edges: updatedEdges,
        updatedAt: new Date(),
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                removedNode: {
                  id: nodeId,
                  name: removedNode.name,
                },
                removedEdges: removedEdgesCount,
                message: "Node and connected edges removed successfully.",
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // update_node - Update a node's inputs or position
  server.registerTool(
    "update_node",
    {
      description: "Update a node's input values or position.",
      inputSchema: {
        workflowId: z.string().describe("The workflow ID"),
        nodeId: z.string().describe("The node ID to update"),
        name: z.string().optional().describe("New display name for the node"),
        position: z
          .object({
            x: z.number(),
            y: z.number(),
          })
          .optional()
          .describe("New position on canvas"),
        inputs: z
          .record(z.string(), z.unknown())
          .optional()
          .describe("Input values to update as key-value pairs"),
      },
    },
    async ({ workflowId, nodeId, name, position, inputs }) => {
      const workflowStore = new WorkflowStore(context.env);

      // Get workflow
      const workflow = await workflowStore.getWithData(
        workflowId,
        context.organizationId
      );
      if (!workflow) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Workflow '${workflowId}' not found.`,
            },
          ],
          isError: true,
        };
      }

      const nodes = workflow.data.nodes || [];

      // Find the node
      const nodeIndex = nodes.findIndex((n: Node) => n.id === nodeId);
      if (nodeIndex === -1) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Node '${nodeId}' not found.`,
            },
          ],
          isError: true,
        };
      }

      const node = nodes[nodeIndex];

      // Update node properties
      if (name !== undefined) {
        node.name = name;
      }

      if (position !== undefined) {
        node.position = position;
      }

      if (inputs !== undefined) {
        for (const [inputName, inputValue] of Object.entries(inputs)) {
          const input = node.inputs.find(
            (i: Parameter) => i.name === inputName
          );
          if (input) {
            input.value = inputValue as Parameter["value"];
          }
        }
      }

      // Save updated workflow
      nodes[nodeIndex] = node;
      // Extract only the fields needed for save (exclude 'data' from getWithData result)
      const { data: _, ...workflowRecord } = workflow;
      await workflowStore.save({
        ...workflowRecord,
        organizationId: context.organizationId,
        nodes,
        edges: workflow.data.edges || [],
        updatedAt: new Date(),
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                nodeId,
                name: node.name,
                message: "Node updated successfully.",
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
