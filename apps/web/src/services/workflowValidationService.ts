import { Workflow, Node } from "@dafthunk/types";
import { Node as ReactFlowNode, Edge as ReactFlowEdge } from "@xyflow/react";

type ValidationResult = {
  readonly isValid: boolean;
  readonly errors: readonly string[];
};

/**
 * Validates if a workflow has all required properties
 */
export function validateWorkflow(workflow: Workflow): ValidationResult {
  const errors: string[] = [
    ...validateNodes(workflow.nodes),
    ...validateEdgeConnections(workflow),
    ...(hasCycles(workflow) ? ["Workflow contains cycles"] : []),
  ];

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates that all nodes have required properties
 */
function validateNodes(nodes: readonly Node[]): string[] {
  const errors: string[] = [];

  for (const node of nodes) {
    if (!node.id || !node.name) {
      errors.push(
        `Node ${node.id || "unknown"} is missing required properties`
      );
    }
  }

  return errors;
}

/**
 * Validates that all edges connect to existing nodes
 */
function validateEdgeConnections(workflow: Workflow): string[] {
  const errors: string[] = [];
  const nodeIds = new Set(workflow.nodes.map((node) => node.id));

  for (const edge of workflow.edges) {
    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge source node ${edge.source} not found`);
    }

    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge target node ${edge.target} not found`);
    }
  }

  return errors;
}

/**
 * Checks if a workflow contains cycles using DFS
 */
export function hasCycles(workflow: Workflow): boolean {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  const hasCyclesDFS = (nodeId: string): boolean => {
    // If node is already in recursion stack, we found a cycle
    if (recursionStack.has(nodeId)) return true;

    // If node was already visited and not in the recursion stack, no cycle here
    if (visited.has(nodeId)) return false;

    visited.add(nodeId);
    recursionStack.add(nodeId);

    const outgoingEdges = workflow.edges.filter(
      (edge) => edge.source === nodeId
    );

    for (const edge of outgoingEdges) {
      if (hasCyclesDFS(edge.target)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  };

  // Check each node as a potential starting point
  for (const node of workflow.nodes) {
    if (!visited.has(node.id) && hasCyclesDFS(node.id)) {
      return true;
    }
  }

  return false;
}

/**
 * Validates that all nodes have the correct type
 */
export function validateNodeTypes(nodes: readonly ReactFlowNode[]): boolean {
  return nodes.every((node) => node.type === "workflowNode");
}

/**
 * Validates that all edges have the correct type
 */
export function validateEdgeTypes(edges: readonly ReactFlowEdge[]): boolean {
  return edges.every((edge) => edge.type === "workflowEdge");
}
