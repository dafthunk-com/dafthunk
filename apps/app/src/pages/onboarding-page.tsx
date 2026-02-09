import type { CreateWorkflowRequest, WorkflowTrigger } from "@dafthunk/types";
// @ts-ignore - https://github.com/lucide-icons/lucide/issues/2867#issuecomment-2847105863
import { DynamicIcon } from "lucide-react/dynamic.mjs";
import Library from "lucide-react/icons/library";
import Play from "lucide-react/icons/play";
import PlusCircle from "lucide-react/icons/plus-circle";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";

import { useAuth } from "@/components/auth-context";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { useTour } from "@/components/tour";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateWorkflowDialog } from "@/components/workflow/create-workflow-dialog";
import { useOrgUrl } from "@/hooks/use-org-url";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import { useTemplates } from "@/services/template-service";
import { createWorkflow, useWorkflows } from "@/services/workflow-service";

const FEATURED_TEMPLATE_IDS = [
  "text-summarization",
  "image-generation",
  "sentiment-analysis",
  "text-translation",
  "web-screenshot",
  "ai-calculator",
];

export function OnboardingPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { organization } = useAuth();
  const { setBreadcrumbs } = usePageBreadcrumbs([]);
  const { getOrgUrl } = useOrgUrl();
  const { mutateWorkflows } = useWorkflows();
  const { templates } = useTemplates();
  const { start: startTour } = useTour();
  const orgHandle = organization?.handle || "";

  const featuredTemplates = useMemo(
    () =>
      FEATURED_TEMPLATE_IDS.flatMap((id) => {
        const t = templates.find((t) => t.id === id);
        return t ? [t] : [];
      }),
    [templates]
  );

  const handleCreateWorkflow = async (
    name: string,
    trigger: WorkflowTrigger
  ) => {
    if (!orgHandle) return;

    const request: CreateWorkflowRequest = {
      name,
      trigger,
      nodes: [],
      edges: [],
    };

    const newWorkflow = await createWorkflow(request, orgHandle);
    mutateWorkflows();
    setIsCreateDialogOpen(false);
    navigate(getOrgUrl(`workflows/${newWorkflow.id}`));
  };

  useEffect(() => {
    setBreadcrumbs([{ label: "Getting Started" }]);
  }, [setBreadcrumbs]);

  return (
    <InsetLayout title="Getting Started">
      <Card
        className="mb-6 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
        data-tour="getting-started-card"
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="size-5 text-red-600 dark:text-red-400" />
            Take a Tour
          </CardTitle>
          <CardDescription>
            Get a guided walkthrough of the platform and learn how to build your
            first workflow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={startTour}>Start Tour</Button>
        </CardContent>
      </Card>

      <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlusCircle className="size-5 text-green-600 dark:text-green-400" />
            Create an Empty Workflow
          </CardTitle>
          <CardDescription>
            Start from scratch and build a custom workflow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            data-tour="create-workflow-button"
          >
            Create Workflow
          </Button>
        </CardContent>
      </Card>

      {featuredTemplates.length > 0 && (
        <div className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featuredTemplates.map((template) => (
              <Card
                key={template.id}
                className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900"
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DynamicIcon
                      name={template.icon as any}
                      className="size-5 text-blue-600 dark:text-blue-400"
                    />
                    {template.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {template.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" asChild>
                    <Link to={getOrgUrl(`templates/${template.id}`)}>
                      Use Template
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card
            className="mt-4 bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900"
            data-tour="import-template-button"
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Library className="size-5 text-purple-600 dark:text-purple-400" />
                More Templates
              </CardTitle>
              <CardDescription>
                Explore our full library of templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to={getOrgUrl("templates")}>Browse Templates</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <CreateWorkflowDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreateWorkflow={handleCreateWorkflow}
      />
    </InsetLayout>
  );
}
