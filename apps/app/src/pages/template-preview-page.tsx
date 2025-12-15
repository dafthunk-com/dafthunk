import type { Node as NodeType, WorkflowTemplate } from "@dafthunk/types";
import type { Edge, Node } from "@xyflow/react";
import { ReactFlowProvider } from "@xyflow/react";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router";

import { WorkflowBuilder } from "@/components/workflow/workflow-builder";
import type {
  WorkflowEdgeType,
  WorkflowNodeType,
} from "@/components/workflow/workflow-types";
import { useTemplates } from "@/services/template-service";
import { useNodeTypes } from "@/services/type-service";

/**
 * Convert a template node to a React Flow node with WorkflowNodeType data
 */
function convertTemplateNodeToReactFlowNode(
  node: NodeType,
  nodeTypes: { id: string; type: string; icon?: string }[]
): Node<WorkflowNodeType> {
  // Find the node type definition to get the icon
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
        id: input.name,
        name: input.name,
        type: input.type as WorkflowNodeType["inputs"][0]["type"],
        description: input.description,
        value: input.value,
        hidden: false,
      })),
      outputs: node.outputs.map((output) => ({
        id: output.name,
        name: output.name,
        type: output.type as WorkflowNodeType["outputs"][0]["type"],
        description: output.description,
        hidden: false,
      })),
      executionState: "idle",
      createObjectUrl: () => "",
    },
  };
}

/**
 * Convert template edges to React Flow edges
 */
function convertTemplateEdgesToReactFlowEdges(
  template: WorkflowTemplate
): Edge<WorkflowEdgeType>[] {
  return template.edges.map((edge, index) => ({
    id: `e-${index}-${edge.source}-${edge.target}`,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceOutput,
    targetHandle: edge.targetInput,
    type: "workflowEdge",
    data: {
      isValid: true,
    },
  }));
}

/**
 * Public template preview page for embedding in external sites
 * No authentication required
 */
export function TemplatePreviewPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const [searchParams] = useSearchParams();
  const showBackground = searchParams.get("bg") !== "false";

  const { templates, isTemplatesLoading } = useTemplates();
  const { nodeTypes, isNodeTypesLoading } = useNodeTypes(undefined, {
    revalidateOnFocus: false,
  });

  const [template, setTemplate] = useState<WorkflowTemplate | null>(null);

  // Find the requested template
  useEffect(() => {
    if (templates.length > 0 && templateId) {
      const found = templates.find((t) => t.id === templateId);
      setTemplate(found || null);
    }
  }, [templates, templateId]);

  // Convert template to React Flow nodes and edges
  const { nodes, edges } = useMemo(() => {
    if (!template || nodeTypes.length === 0) {
      return { nodes: [], edges: [] };
    }

    const convertedNodes = template.nodes.map((node) =>
      convertTemplateNodeToReactFlowNode(node, nodeTypes)
    );

    const convertedEdges = convertTemplateEdgesToReactFlowEdges(template);

    return { nodes: convertedNodes, edges: convertedEdges };
  }, [template, nodeTypes]);

  // Loading state
  if (isTemplatesLoading || isNodeTypesLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-neutral-50">
        <div className="animate-pulse text-neutral-400">Loading...</div>
      </div>
    );
  }

  // Template not found
  if (!template) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-neutral-500">Template not found</div>
      </div>
    );
  }

  return (
    <div
      className="w-full h-screen"
      style={{ background: showBackground ? undefined : "transparent" }}
    >
      <ReactFlowProvider>
        <WorkflowBuilder
          workflowId={`template-${template.id}`}
          workflowType={template.type}
          initialNodes={nodes}
          initialEdges={edges}
          nodeTypes={nodeTypes}
          disabled={true}
          expandedOutputs={false}
          createObjectUrl={() => ""}
          orgHandle=""
          showSidebar={false}
        />
      </ReactFlowProvider>
    </div>
  );
}
