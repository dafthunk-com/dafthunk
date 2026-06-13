import type { Edge, NodeType, Parameter, Workflow } from "@dafthunk/types";

export interface ValidationError {
  type:
    | "CYCLE_DETECTED"
    | "TYPE_MISMATCH"
    | "INVALID_CONNECTION"
    | "DUPLICATE_CONNECTION"
    | "DUPLICATE_NODE_ID"
    | "DUPLICATE_TRIGGER"
    | "EMPTY_WORKFLOW";
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

// Blob-compatible types: a `blob` parameter can connect to any of these
const blobTypes = new Set([
  "image",
  "audio",
  "video",
  "document",
  "buffergeometry",
  "gltf",
]);

/**
 * Validates type compatibility between connected parameters.
 * Returns one error per invalid connection so all problems surface at once.
 */
export function validateTypeCompatibility(
  workflow: Workflow
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const connection of workflow.edges) {
    const sourceNode = workflow.nodes.find(
      (n: Workflow["nodes"][number]): boolean => n.id === connection.source
    );
    const targetNode = workflow.nodes.find(
      (n: Workflow["nodes"][number]): boolean => n.id === connection.target
    );

    if (!sourceNode || !targetNode) {
      errors.push({
        type: "INVALID_CONNECTION",
        message: "Invalid node reference in connection",
        details: {
          connectionSource: connection.source,
          connectionTarget: connection.target,
        },
      });
      continue;
    }

    const sourceParam = sourceNode.outputs.find(
      (o: Parameter): boolean => o.name === connection.sourceOutput
    );
    const targetParam = targetNode.inputs.find(
      (i: Parameter): boolean => i.name === connection.targetInput
    );

    if (!sourceParam || !targetParam) {
      errors.push({
        type: "INVALID_CONNECTION",
        message: "Invalid parameter reference in connection",
        details: {
          connectionSource: connection.source,
          connectionTarget: connection.target,
        },
      });
      continue;
    }

    // Check type compatibility
    const exactMatch = sourceParam.type === targetParam.type;
    const anyTypeMatch =
      sourceParam.type === "any" || targetParam.type === "any";
    const blobCompatible =
      (sourceParam.type === "blob" && blobTypes.has(targetParam.type)) ||
      (targetParam.type === "blob" && blobTypes.has(sourceParam.type));

    const typesMatch = exactMatch || anyTypeMatch || blobCompatible;

    if (!typesMatch) {
      errors.push({
        type: "TYPE_MISMATCH",
        message: `Type mismatch: ${sourceParam.type.toLowerCase().replace("value", "")} -> ${targetParam.type.toLowerCase().replace("value", "")}`,
        details: {
          connectionSource: connection.source,
          connectionTarget: connection.target,
        },
      });
    }
  }

  return errors;
}

/**
 * Validates the entire workflow
 */
export function validateWorkflow(
  workflow: Workflow,
  nodeTypes?: NodeType[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check for multiple trigger nodes
  if (nodeTypes) {
    const triggerTypes = new Set(
      nodeTypes.filter((t) => t.trigger).map((t) => t.type)
    );
    const triggerNodes = workflow.nodes.filter((n) => triggerTypes.has(n.type));
    if (triggerNodes.length > 1) {
      errors.push({
        type: "DUPLICATE_TRIGGER",
        message: "Only one trigger node is allowed per workflow",
        details: { nodeId: triggerNodes[1].id },
      });
    }
  }

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
  errors.push(...validateTypeCompatibility(workflow));

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
