import type { CreateWorkflowRequest } from "@dafthunk/types";
import { ReactFlowProvider } from "@xyflow/react";
import Import from "lucide-react/icons/import";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { useAuth } from "@/components/auth-context";
import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { WorkflowBuilder } from "@/components/workflow/workflow-builder";
import { useOrgUrl } from "@/hooks/use-org-url";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import { useTemplate } from "@/services/template-service";
import { useNodeTypes } from "@/services/type-service";
import { createWorkflow } from "@/services/workflow-service";
import {
  convertTemplateEdgesToReactFlowEdges,
  convertTemplateNodeToReactFlowNode,
} from "@/utils/template-utils";

export function TemplateDetailPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { setBreadcrumbs } = usePageBreadcrumbs([]);
  const { getOrgUrl } = useOrgUrl();
  const { organization } = useAuth();
  const orgHandle = organization?.handle || "";

  const { template, templateError, isTemplateLoading } =
    useTemplate(templateId);
  const { nodeTypes, isNodeTypesLoading } = useNodeTypes(undefined, {
    revalidateOnFocus: false,
  });

  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    setBreadcrumbs([
      { label: "Workflows", to: getOrgUrl("workflows") },
      { label: template?.name || "Loading..." },
    ]);
  }, [setBreadcrumbs, getOrgUrl, template?.name]);

  const { nodes, edges } = useMemo(() => {
    if (!template || nodeTypes.length === 0) {
      return { nodes: [], edges: [] };
    }
    return {
      nodes: template.nodes.map((node) =>
        convertTemplateNodeToReactFlowNode(node, nodeTypes)
      ),
      edges: convertTemplateEdgesToReactFlowEdges(template),
    };
  }, [template, nodeTypes]);

  const handleImport = async () => {
    if (!template || !orgHandle) return;

    setIsImporting(true);
    try {
      const request: CreateWorkflowRequest = {
        name: template.name,
        description: template.description,
        trigger: template.trigger,
        nodes: template.nodes,
        edges: template.edges,
      };
      const newWorkflow = await createWorkflow(request, orgHandle);
      navigate(getOrgUrl(`workflows/${newWorkflow.id}`));
    } catch (error) {
      console.error("Failed to import template:", error);
    } finally {
      setIsImporting(false);
    }
  };

  if (isTemplateLoading || isNodeTypesLoading) {
    return <InsetLoading title="Template" />;
  }

  if (templateError) {
    return <InsetError title="Template" errorMessage={templateError.message} />;
  }

  if (!template) {
    return <InsetError title="Template" errorMessage="Template not found" />;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-background px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{template.name}</h1>
          <p className="text-sm text-muted-foreground">
            {template.description}
          </p>
        </div>
        <Button onClick={handleImport} disabled={isImporting}>
          {isImporting ? (
            <Spinner className="h-4 w-4 mr-2" />
          ) : (
            <Import className="h-4 w-4 mr-2" />
          )}
          Import as Workflow
        </Button>
      </div>
      <div className="flex-1 min-h-0">
        <ReactFlowProvider>
          <WorkflowBuilder
            workflowId={`template-${template.id}`}
            workflowTrigger={template.trigger}
            initialNodes={nodes}
            initialEdges={edges}
            nodeTypes={nodeTypes}
            disabled={true}
            expandedOutputs={false}
            createObjectUrl={() => ""}
            orgHandle={orgHandle}
            showSidebar={false}
          />
        </ReactFlowProvider>
      </div>
    </div>
  );
}
