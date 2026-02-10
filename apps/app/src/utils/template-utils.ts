import type { Node as NodeType, WorkflowTemplate } from "@dafthunk/types";
import type { Edge, Node } from "@xyflow/react";

import type {
  WorkflowEdgeType,
  WorkflowNodeType,
} from "@/components/workflow/workflow-types";

export function convertTemplateNodeToReactFlowNode(
  node: NodeType,
  nodeTypes: { id: string; type: string; icon?: string }[]
): Node<WorkflowNodeType> {
  const nodeTypeDef = nodeTypes.find((nt) => nt.type === node.type);

  return {
    id: node.id,
    type: "workflowNode",
    position: node.position,
    dragHandle: ".workflow-node-drag-handle",
    data: {
      name: node.name,
      icon: node.icon || nodeTypeDef?.icon || "box",
      nodeType: node.type,
      inputs: node.inputs.map((input) => ({
        ...input,
        id: input.name,
      })),
      outputs: node.outputs.map((output) => ({
        ...output,
        id: output.name,
      })),
      functionCalling: node.functionCalling,
      executionState: "idle",
      createObjectUrl: () => "",
    },
  };
}

export function convertTemplateEdgesToReactFlowEdges(
  template: WorkflowTemplate
): Edge<WorkflowEdgeType>[] {
  return template.edges.map((edge, index) => ({
    id: `e-${index}-${edge.source}-${edge.target}`,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceOutput,
    targetHandle: edge.targetInput,
    type: "workflowEdge",
    data: { isValid: true },
  }));
}
