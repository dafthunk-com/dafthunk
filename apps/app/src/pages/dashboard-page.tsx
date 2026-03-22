import type {
  CreateWorkflowRequest,
  WorkflowRuntime,
  WorkflowTrigger,
} from "@dafthunk/types";
import FileDown from "lucide-react/icons/file-down";
import Logs from "lucide-react/icons/logs";
import MapIcon from "lucide-react/icons/map";
import MessageCircle from "lucide-react/icons/message-circle";
import PlusCircle from "lucide-react/icons/plus-circle";
import Workflow from "lucide-react/icons/workflow";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAssistant } from "@/components/assistant/assistant-provider";
import { useAuth } from "@/components/auth-context";
import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { useTour } from "@/components/tour";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateWorkflowDialog } from "@/components/workflow/create-workflow-dialog";
import { buildInitialTriggerNodes } from "@/components/workflow/trigger-node-mapping";
import { useOrgUrl } from "@/hooks/use-org-url";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import { useBilling } from "@/services/billing-service";
import { useDashboard } from "@/services/dashboard-service";
import { useNodeTypes } from "@/services/type-service";
import { createWorkflow, useWorkflows } from "@/services/workflow-service";

export function DashboardPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { setBreadcrumbs } = usePageBreadcrumbs([]);
  const { dashboardStats, dashboardStatsError, isDashboardStatsLoading } =
    useDashboard();
  const { billing, billingError, isBillingLoading } = useBilling();
  const { getOrgUrl } = useOrgUrl();
  const { organization } = useAuth();
  const orgId = organization?.id || "";
  const { mutateWorkflows } = useWorkflows();
  const { nodeTypes } = useNodeTypes({ revalidateOnFocus: false });
  const { start: startTour } = useTour();
  const { open: openAssistant } = useAssistant();

  useEffect(() => {
    setBreadcrumbs([{ label: "Dashboard" }]);
  }, [setBreadcrumbs]);

  const handleCreateWorkflow = async (
    name: string,
    trigger: WorkflowTrigger,
    description?: string,
    runtime?: WorkflowRuntime
  ) => {
    if (!orgId) return;

    try {
      const initialNodes = buildInitialTriggerNodes(trigger, nodeTypes || []);
      const request: CreateWorkflowRequest = {
        name,
        description,
        trigger,
        runtime,
        nodes: initialNodes,
        edges: [],
      };

      const newWorkflow = await createWorkflow(request, orgId);

      mutateWorkflows();
      navigate(getOrgUrl(`workflows/${newWorkflow.id}`));
    } catch (error) {
      console.error("Failed to create workflow:", error);
    }
  };

  if (isDashboardStatsLoading || isBillingLoading) {
    return <InsetLoading title="Dashboard" />;
  } else if (dashboardStatsError || billingError) {
    return (
      <InsetError
        title="Dashboard"
        errorMessage={
          dashboardStatsError?.message ||
          billingError?.message ||
          "An error occurred"
        }
      />
    );
  }

  if (!dashboardStats) {
    return (
      <InsetLayout title="Dashboard">
        <div className="flex flex-1 items-center justify-center">
          No dashboard data available.
        </div>
      </InsetLayout>
    );
  }

  const isPro = billing?.plan === "pro";
  const usageThisPeriod = billing?.usageThisPeriod ?? 0;
  const includedCredits = billing?.includedCredits ?? 0;
  const usagePercent = includedCredits
    ? Math.min(100, (usageThisPeriod / includedCredits) * 100)
    : 0;
  const hasOverageLimit = billing?.overageLimit != null;
  const currentOverage = Math.max(0, usageThisPeriod - includedCredits);
  const isOverageAtLimit =
    hasOverageLimit && currentOverage >= billing!.overageLimit!;

  return (
    <InsetLayout title="Dashboard">
      {/* Getting Started */}
      <Card className="mb-6 bg-neutral-50 dark:bg-neutral-950/20">
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
          <CardDescription>
            Create your first workflow or explore templates
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button variant="default" onClick={startTour}>
            <MapIcon className="mr-2 size-4" />
            Take a Tour
          </Button>
          <Button variant="outline" onClick={() => setIsCreateDialogOpen(true)}>
            <PlusCircle className="mr-2 size-4" />
            Create Workflow
          </Button>
          <Button variant="outline" asChild>
            <Link to={getOrgUrl("templates")}>
              <FileDown className="mr-2 size-4" />
              Browse Templates
            </Link>
          </Button>
          <Button variant="outline" onClick={openAssistant}>
            <MessageCircle className="mr-2 size-4" />
            Chat with Assistant
          </Button>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card data-tour="workflows-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xl">Workflows</CardTitle>
            <Workflow className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{dashboardStats.workflows}</div>
            <p className="text-xs text-muted-foreground pt-1">
              Number of workflows
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 text-xs h-8"
              asChild
            >
              <Link to={getOrgUrl("workflows")}>View Workflows</Link>
            </Button>
          </CardContent>
        </Card>
        <Card data-tour="executions-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xl">Executions</CardTitle>
            <Logs className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {dashboardStats.executions.total}
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              Number of executions
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 text-xs h-8"
              asChild
            >
              <Link to={getOrgUrl("executions")}>View Executions</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Credits Section */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                Usage
                <Badge variant={isPro ? "default" : "secondary"}>
                  {isPro ? "Early Adopter" : "Trial"}
                </Badge>
              </CardTitle>
              <CardDescription>
                {isPro
                  ? "Monthly credits reset each billing period"
                  : "One-time credits for Trial accounts"}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to={getOrgUrl("billing")}>Manage Billing</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Included Usage Gauge */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">
                {isPro ? "Included Usage" : "Available Usage"}
              </span>
              <span>
                {Math.min(usageThisPeriod, includedCredits).toLocaleString()} /{" "}
                {includedCredits.toLocaleString()}
              </span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all rounded-full"
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {usagePercent < 100
                ? `${(includedCredits - usageThisPeriod).toLocaleString()} remaining`
                : isPro
                  ? "Included usage exhausted"
                  : "Usage exhausted"}
            </p>
          </div>

          {/* Overage Section - Pro only */}
          {isPro && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Additional Usage</span>
                <span>
                  {currentOverage.toLocaleString()}
                  {hasOverageLimit &&
                    ` / ${billing!.overageLimit!.toLocaleString()}`}
                </span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                {currentOverage > 0 && (
                  <div
                    className={`h-full transition-all rounded-full ${isOverageAtLimit ? "bg-red-500" : "bg-orange-500"}`}
                    style={{
                      width: hasOverageLimit
                        ? `${Math.min(100, (currentOverage / billing!.overageLimit!) * 100)}%`
                        : `${Math.min(100, (currentOverage / includedCredits) * 100)}%`,
                    }}
                  />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {currentOverage > 0
                  ? isOverageAtLimit
                    ? "Limit reached - executions will be blocked"
                    : "Billed at the end of your billing period"
                  : hasOverageLimit
                    ? `Limit: ${billing!.overageLimit!.toLocaleString()} credits`
                    : "No overage charges yet"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      <CreateWorkflowDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreateWorkflow={handleCreateWorkflow}
      />
    </InsetLayout>
  );
}
