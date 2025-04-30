import { Edge } from "@dafthunk/types";
import { Edge as ReactFlowEdge, Connection } from "reactflow";

export type ConnectionValidationResult = 
  | { status: "valid" }
  | { status: "invalid"; reason: string };

export const workflowEdgeService = {
  convertToReactFlowEdges(edges: readonly Edge[]): readonly ReactFlowEdge[] {
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
    if (!connection.source || !connection.target) {
      throw new Error("Invalid connection: missing source or target");
    }
    
    return {
      source: connection.source,
      target: connection.target,
      sourceOutput: connection.sourceHandle || "",
      targetInput: connection.targetHandle || "",
    };
  },

  validateConnection(
    connection: Connection,
    edges: readonly ReactFlowEdge[]
  ): ConnectionValidationResult {
    if (!connection.source || !connection.target) {
      return { 
        status: "invalid", 
        reason: "Missing source or target" 
      };
    }

    const sourceNode = connection.source;
    const targetNode = connection.target;

    // Prevent self-connections
    if (sourceNode === targetNode) {
      return { 
        status: "invalid", 
        reason: "Cannot connect a node to itself" 
      };
    }

    // Check for direct cycles (A→B→A)
    const directCycle = edges.some(
      (edge) => edge.source === targetNode && edge.target === sourceNode
    );

    if (directCycle) {
      return { 
        status: "invalid", 
        reason: "Would create a direct cycle" 
      };
    }

    // Check for indirect cycles (A→B→C→A)
    if (this.wouldCreateIndirectCycle(sourceNode, targetNode, edges)) {
      return { 
        status: "invalid", 
        reason: "Would create an indirect cycle" 
      };
    }

    return { status: "valid" };
  },

  wouldCreateIndirectCycle(
    sourceNode: string, 
    targetNode: string, 
    edges: readonly ReactFlowEdge[]
  ): boolean {
    // Use depth-first search to check if target can reach source
    const visited = new Set<string>();
    
    const dfs = (currentNode: string): boolean => {
      if (currentNode === sourceNode) return true;
      if (visited.has(currentNode)) return false;
      
      visited.add(currentNode);
      
      // Find all outgoing edges from current node
      const outgoingEdges = edges.filter(edge => edge.source === currentNode);
      
      for (const edge of outgoingEdges) {
        if (dfs(edge.target)) return true;
      }
      
      return false;
    };
    
    return dfs(targetNode);
  }
} as const;
