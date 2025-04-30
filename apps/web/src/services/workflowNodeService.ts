import { Node as ReactFlowNode, XYPosition } from "reactflow";
import { API_BASE_URL } from "../config/api";
import { Node, NodeType, Parameter } from "@dafthunk/types";
import { NodeExecutionState } from "@/components/workflow/workflow-types.tsx";

type WorkflowNodeData = {
  readonly name: string;
  readonly inputs: readonly Parameter[];
  readonly outputs: readonly Parameter[];
  readonly error?: string;
  readonly executionState: NodeExecutionState;
};

/**
 * Converts domain nodes to ReactFlow compatible nodes
 */
export function convertToReactFlowNodes(nodes: readonly Node[]): readonly ReactFlowNode<WorkflowNodeData>[] {
  return nodes.map((node) => ({
    id: node.id,
    type: "workflowNode",
    position: node.position,
    data: {
      name: node.name,
      inputs: node.inputs,
      outputs: node.outputs,
      error: node.error,
      executionState: "idle" as NodeExecutionState,
    },
  }));
}

/**
 * Creates a new node from a template at the specified position
 */
export function createNode(template: NodeType, position: XYPosition): Node {
  return {
    id: `node-${Date.now()}`,
    type: template.id,
    name: template.name,
    position,
    inputs: template.inputs.map((input) => ({
      ...input,
      id: input.name,
    })),
    outputs: template.outputs.map((output) => ({
      ...output,
      id: output.name,
    })),
  };
}

/**
 * Updates the execution state of a specific node in the node collection
 */
export function updateNodeExecutionState(
  nodes: readonly ReactFlowNode[],
  nodeId: string,
  state: NodeExecutionState
): readonly ReactFlowNode[] {
  return nodes.map((node) => 
    node.id === nodeId
      ? { ...node, data: { ...node.data, executionState: state } }
      : node
  );
}

/**
 * Fetches available node types from the API
 */
export async function fetchNodeTypes(): Promise<readonly NodeType[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/types`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch node types: ${response.statusText}`);
    }

    return await response.json() as NodeType[];
  } catch (error) {
    console.error("Error fetching node types:", error);
    throw new Error(
      `Failed to load node types: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
