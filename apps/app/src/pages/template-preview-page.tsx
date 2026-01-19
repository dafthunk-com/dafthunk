import type { WorkflowTemplate } from "@dafthunk/types";
import { ReactFlowProvider } from "@xyflow/react";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router";

import { WorkflowBuilder } from "@/components/workflow/workflow-builder";
import { useTemplates } from "@/services/template-service";
import { useNodeTypes } from "@/services/type-service";
import {
  convertTemplateEdgesToReactFlowEdges,
  convertTemplateNodeToReactFlowNode,
} from "@/utils/template-utils";

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
          workflowTrigger={template.trigger}
          initialNodes={nodes}
          initialEdges={edges}
          nodeTypes={nodeTypes}
          disabledWorkflow={true}
          expandedOutputs={false}
          createObjectUrl={() => ""}
          orgHandle=""
          showSidebar={false}
        />
      </ReactFlowProvider>
    </div>
  );
}
