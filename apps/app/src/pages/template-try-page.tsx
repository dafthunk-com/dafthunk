import type { CreateWorkflowRequest } from "@dafthunk/types";
import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router";

import { useAuth } from "@/components/auth-context";
import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { useOrgUrl } from "@/hooks/use-org-url";
import { useTemplate } from "@/services/template-service";
import { createWorkflow } from "@/services/workflow-service";

export function TemplateTryPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { getOrgUrl } = useOrgUrl();
  const { organization } = useAuth();
  const orgHandle = organization?.handle || "";

  const { template, templateError } = useTemplate(templateId);

  const creatingRef = useRef(false);

  useEffect(() => {
    if (!template || !orgHandle || creatingRef.current) return;
    creatingRef.current = true;

    const create = async () => {
      try {
        const request: CreateWorkflowRequest = {
          name: template.name,
          description: template.description,
          trigger: template.trigger,
          nodes: template.nodes,
          edges: template.edges,
        };
        const newWorkflow = await createWorkflow(request, orgHandle);
        navigate(getOrgUrl(`workflows/${newWorkflow.id}`), { replace: true });
      } catch (error) {
        console.error("Failed to create workflow from template:", error);
        creatingRef.current = false;
      }
    };

    create();
  }, [template, orgHandle, navigate, getOrgUrl]);

  if (templateError) {
    return <InsetError title="Template" errorMessage={templateError.message} />;
  }

  return <InsetLoading title="Creating workflow..." />;
}
