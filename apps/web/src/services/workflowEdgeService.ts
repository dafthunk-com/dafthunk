import { Edge } from "@dafthunk/types";
import { Edge as ReactFlowEdge, Connection } from "reactflow";

export type ConnectionValidationState = "default" | "valid" | "invalid";

export const workflowEdgeService = {
  convertToReactFlowEdges(edges: Edge[]): ReactFlowEdge[] {
    return edges.map((edge, index) => ({
      id: `e${index}`,
      type: "workflowEdge",
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceOutput,
      targetHandle: edge.targetInput,
    }));
  },

  convertToWorkflowEdge(connection: Connection): Edge {
    return {
      source: connection.source || "",
      target: connection.target || "",
      sourceOutput: connection.sourceHandle || "",
      targetInput: connection.targetHandle || "",
    };
  },

  validateConnection(
    connection: Connection,
    edges: ReactFlowEdge[]
  ): ConnectionValidationState {
    if (!connection.source || !connection.target) {
      return "invalid";
    }

    // Check if the connection would create a cycle
    const sourceNode = connection.source;
    const targetNode = connection.target;

    // Simple cycle detection: check if target node is already connected to source node
    const existingEdge = edges.find(
      (edge) => edge.source === targetNode && edge.target === sourceNode
    );

    if (existingEdge) {
      return "invalid"; // Prevent cycles
    }

    return "valid";
  },
};
