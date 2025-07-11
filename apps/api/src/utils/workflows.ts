import { Edge, Parameter, Workflow } from "@dafthunk/types";

export interface ValidationError {
  type:
    | "CYCLE_DETECTED"
    | "TYPE_MISMATCH"
    | "INVALID_CONNECTION"
    | "DUPLICATE_CONNECTION"
    | "DUPLICATE_NODE_ID";
  message: string;
  details: {
    nodeId?: string;
    connectionSource?: string;
    connectionTarget?: string;
  };
}

/**
 * Checks if there are any cycles in the workflow using DFS
 */
export function detectCycles(workflow: Workflow): ValidationError | null {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const outgoingConnections = workflow.edges.filter(
      (conn: Edge): boolean => conn.source === nodeId
    );
    for (const connection of outgoingConnections) {
      if (!visited.has(connection.target)) {
        if (dfs(connection.target)) {
          return true;
        }
      } else if (recursionStack.has(connection.target)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  for (const node of workflow.nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) {
        return {
          type: "CYCLE_DETECTED",
          message: "Cycle detected in workflow",
          details: { nodeId: node.id },
        };
      }
    }
  }

  return null;
}

/**
 * Validates type compatibility between connected parameters
 */
export function validateTypeCompatibility(
  workflow: Workflow
): ValidationError | null {
  for (const connection of workflow.edges) {
    const sourceNode = workflow.nodes.find(
      (n: Workflow["nodes"][number]): boolean => n.id === connection.source
    );
    const targetNode = workflow.nodes.find(
      (n: Workflow["nodes"][number]): boolean => n.id === connection.target
    );

    if (!sourceNode || !targetNode) {
      return {
        type: "INVALID_CONNECTION",
        message: "Invalid node reference in connection",
        details: {
          connectionSource: connection.source,
          connectionTarget: connection.target,
        },
      };
    }

    const sourceParam = sourceNode.outputs.find(
      (o: Parameter): boolean => o.name === connection.sourceOutput
    );
    const targetParam = targetNode.inputs.find(
      (i: Parameter): boolean => i.name === connection.targetInput
    );

    if (!sourceParam || !targetParam) {
      return {
        type: "INVALID_CONNECTION",
        message: "Invalid parameter reference in connection",
        details: {
          connectionSource: connection.source,
          connectionTarget: connection.target,
        },
      };
    }

    if (sourceParam.type !== targetParam.type) {
      // Allow "any" type to be compatible with all other types
      if (sourceParam.type === "any" || targetParam.type === "any") {
        continue;
      }

      return {
        type: "TYPE_MISMATCH",
        message: `Type mismatch: ${sourceParam.type.toLowerCase().replace("value", "")} -> ${targetParam.type.toLowerCase().replace("value", "")}`,
        details: {
          connectionSource: connection.source,
          connectionTarget: connection.target,
        },
      };
    }
  }

  return null;
}

/**
 * Validates the entire workflow
 */
export function validateWorkflow(workflow: Workflow): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check for duplicate node IDs
  const nodeIds = workflow.nodes.map((n) => n.id);
  const seen = new Set<string>();
  const duplicates = nodeIds.filter((id) => {
    if (seen.has(id)) return true;
    seen.add(id);
    return false;
  });
  if (duplicates.length > 0) {
    errors.push({
      type: "DUPLICATE_NODE_ID" as const,
      message: `Duplicate node IDs found: ${[...new Set(duplicates)].join(", ")}`,
      details: {},
    });
  }

  // Check for cycles
  const cycleError = detectCycles(workflow);
  if (cycleError) {
    errors.push(cycleError);
  }

  // Check type compatibility
  const typeError = validateTypeCompatibility(workflow);
  if (typeError) {
    errors.push(typeError);
  }

  // Check for duplicate connections
  const connections = new Set<string>();
  for (const connection of workflow.edges) {
    const connectionKey = `${connection.source}:${connection.sourceOutput}->${connection.target}:${connection.targetInput}`;
    if (connections.has(connectionKey)) {
      errors.push({
        type: "DUPLICATE_CONNECTION",
        message: "Duplicate connection detected",
        details: {
          connectionSource: connection.source,
          connectionTarget: connection.target,
        },
      });
    }
    connections.add(connectionKey);
  }

  return errors;
}
