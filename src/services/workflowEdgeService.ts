import { Edge } from "@/lib/server/api/types";
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

    // We no longer need to check if a connection already exists to the same target input
    // since we'll be replacing it with the new connection
    return "valid";
  },
};
