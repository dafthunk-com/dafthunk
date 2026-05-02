import { ReactFlowProvider } from "@xyflow/react";
import { useEffect, useMemo } from "react";
import { useParams, useSearchParams } from "react-router";

import { WorkflowBuilder } from "@/components/workflow/workflow-builder";
import { useTemplate } from "@/services/template-service";
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
  const paddingParam = searchParams.get("padding");
  const fitViewPadding =
    paddingParam !== null && Number.isFinite(Number(paddingParam))
      ? Number(paddingParam)
      : undefined;

  const { template, isTemplateLoading } = useTemplate(templateId);
  const { nodeTypes, isNodeTypesLoading } = useNodeTypes({
    revalidateOnFocus: false,
  });

  // When embedded without background, make html/body transparent so the
  // host page's background shows through the iframe.
  useEffect(() => {
    if (showBackground) return;
    const { documentElement, body } = document;
    const prevHtml = documentElement.style.background;
    const prevBody = body.style.background;
    documentElement.style.background = "transparent";
    body.style.background = "transparent";
    return () => {
      documentElement.style.background = prevHtml;
      body.style.background = prevBody;
    };
  }, [showBackground]);

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
  if (isTemplateLoading || isNodeTypesLoading) {
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
      style={
        showBackground
          ? undefined
          : {
              background: "transparent",
              ["--xy-background-color" as string]: "transparent",
            }
      }
    >
      <ReactFlowProvider>
        <WorkflowBuilder
          workflowId={`template-${template.id}`}
          workflowTrigger={template.trigger}
          initialNodes={nodes}
          initialEdges={edges}
          nodeTypes={nodeTypes}
          mode="preview"
          expandedOutputs={false}
          createObjectUrl={() => ""}
          orgId=""
          showBackground={showBackground}
          fitViewPadding={fitViewPadding}
        />
      </ReactFlowProvider>
    </div>
  );
}
