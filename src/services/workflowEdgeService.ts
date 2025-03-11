import { Edge } from "@lib/workflowModel.ts";
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

    // Check if connection already exists
    const connectionExists = edges.some(
      (edge) =>
        edge.source === connection.source &&
        edge.target === connection.target &&
        edge.sourceHandle === connection.sourceHandle &&
        edge.targetHandle === connection.targetHandle
    );

    return connectionExists ? "invalid" : "valid";
  },
};
