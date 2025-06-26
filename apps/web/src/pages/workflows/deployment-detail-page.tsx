import type { DeploymentVersion } from "@dafthunk/types";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import {
  ArrowDown,
  ArrowUpToLine,
  CalendarClock,
  GitCommitHorizontal,
  Globe,
  History,
  Mail,
  MoreHorizontal,
  Play,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";

import { useAuth } from "@/components/auth-context";
import { DeploymentInfoCard } from "@/components/deployments/deployment-info-card";
import { WorkflowInfoCard } from "@/components/deployments/workflow-info-card";
import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTableCard } from "@/components/ui/data-table-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmailTriggerDialog } from "@/components/workflow/email-trigger-dialog";
import { ExecutionFormDialog } from "@/components/workflow/execution-form-dialog";
import { HttpIntegrationDialog } from "@/components/workflow/http-integration-dialog";
import {
  type CronFormData,
  SetCronDialog,
} from "@/components/workflow/set-cron-dialog";
import type { NodeTemplate } from "@/components/workflow/workflow-types";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import {
  createDeployment,
  useDeploymentHistory,
} from "@/services/deployment-service";
import { useNodeTypes } from "@/services/type-service";
import {
  upsertCronTrigger,
  useCronTrigger,
  useWorkflow,
  useWorkflowExecution,
} from "@/services/workflow-service";
import { adaptDeploymentNodesToReactFlowNodes } from "@/utils/utils";

// --- Inline deployment history columns and helper ---
const formatDeploymentDate = (dateString: string | Date) => {
  try {
    return format(new Date(dateString), "MMM d, yyyy h:mm a");
  } catch (_error) {
    return String(dateString);
  }
};

function createDeploymentHistoryColumns(
  currentDeploymentId: string
): ColumnDef<DeploymentVersion>[] {
  return [
    {
      accessorKey: "id",
      header: "Deployment UUID",
      cell: ({ row }) => {
        const deployment = row.original;
        const isCurrent = deployment.id === currentDeploymentId;
        return (
          <div className="font-mono text-xs">
            {isCurrent ? (
              <div className="flex items-center">
                <Link
                  to={`/workflows/deployment/${deployment.id}`}
                  className="hover:underline"
                >
                  {deployment.id}
                </Link>
                <Badge variant="outline" className="ml-2">
                  Current
                </Badge>
              </div>
            ) : (
              <Link
                to={`/workflows/deployment/${deployment.id}`}
                className="hover:underline"
              >
                {deployment.id}
              </Link>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "version",
      header: "Deployment Version",
      cell: ({ row }) => (
        <Link
          to={`/workflows/deployment/${row.original.id}`}
          className="hover:underline"
        >
          <Badge variant="secondary" className="gap-1">
            <GitCommitHorizontal className="h-3.5 w-3.5" />v
            {row.original.version}
          </Badge>
        </Link>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created At",
      cell: ({ row }) => (
        <div className="flex items-center">
          {formatDeploymentDate(row.original.createdAt)}
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to={`/workflows/deployment/${row.original.id}`}>
                  View Version
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];
}

export function DeploymentDetailPage() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();
  const { organization } = useAuth();
  const orgHandle = organization?.handle || "";

  const { setBreadcrumbs } = usePageBreadcrumbs([]);

  const [isDeployDialogOpen, setIsDeployDialogOpen] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState(false);
  const [isIntegrationDialogOpen, setIsIntegrationDialogOpen] = useState(false);

  const { cronTrigger, mutateCronTrigger } = useCronTrigger(workflowId!);

  const {
    workflow: workflowSummary,
    deployments,
    deploymentHistoryError,
    isDeploymentHistoryLoading,
    mutateHistory: mutateDeploymentHistory,
  } = useDeploymentHistory(workflowId!);

  const { workflow, workflowError, isWorkflowLoading } = useWorkflow(
    workflowId || null
  );

  const { nodeTypes, isNodeTypesLoading } = useNodeTypes(workflow?.type);

  const nodeTemplates: NodeTemplate[] = useMemo(
    () =>
      nodeTypes?.map((type) => ({
        id: type.id,
        type: type.id,
        name: type.name,
        description: type.description || "",
        category: type.category,
        inputs: type.inputs.map((input) => ({
          id: input.name, // Assuming name is unique identifier for input/output handles
          type: input.type,
          name: input.name,
          hidden: input.hidden,
        })),
        outputs: type.outputs.map((output) => ({
          id: output.name, // Assuming name is unique identifier for input/output handles
          type: output.type,
          name: output.name,
          hidden: output.hidden,
        })),
      })) || [],
    [nodeTypes]
  );

  const {
    executeWorkflow,
    isFormDialogVisible,
    executionFormParameters,
    submitFormData,
    closeExecutionForm,
  } = useWorkflowExecution(orgHandle);

  const currentDeployment =
    deployments && deployments.length > 0 ? deployments[0] : null;

  useEffect(() => {
    if (workflowSummary) {
      setBreadcrumbs([
        { label: "Deployments", to: "/workflows/deployments" },
        { label: workflowSummary.name },
      ]);
    } else {
      setBreadcrumbs([
        { label: "Deployments", to: "/workflows/deployments" },
        { label: "Detail" },
      ]);
    }
  }, [workflowSummary, setBreadcrumbs]);

  const deployWorkflow = async () => {
    if (!workflowId || !orgHandle) return;

    try {
      // Use the createDeployment function from deploymentService
      await createDeployment(workflowId, orgHandle);

      toast.success("Workflow deployed successfully");
      setIsDeployDialogOpen(false);
      mutateDeploymentHistory();
    } catch (error) {
      console.error("Error deploying workflow:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to deploy workflow. Please try again."
      );
    }
  };

  const handleExecuteLatestVersion = () => {
    if (!workflowId || !currentDeployment || !workflow) return;
    executeWorkflow(
      workflowId,
      (execution) => {
        if (execution.status === "submitted") {
          toast.success("Workflow execution submitted");
        } else if (execution.status === "completed") {
          toast.success("Workflow execution completed");
        } else if (execution.status === "error") {
          toast.error("Workflow execution failed");
        } else if (execution.status === "exhausted") {
          toast.error(
            "You have run out of compute credits. Thanks for checking out the preview. The code is available at https://github.com/dafthunk-com/dafthunk."
          );
        }
      },
      adaptDeploymentNodesToReactFlowNodes(currentDeployment.nodes),
      nodeTemplates,
      workflow.type
    );
  };

  const handleSaveCron = async (data: CronFormData) => {
    if (!workflowId || !orgHandle) return;
    try {
      const updatedCron = await upsertCronTrigger(workflowId, orgHandle, {
        cronExpression: data.cronExpression,
        active: data.active,
        versionAlias: data.versionAlias,
        versionNumber: data.versionNumber,
      });
      mutateCronTrigger(updatedCron);
      toast.success("Cron schedule saved successfully.");
      setIsIntegrationDialogOpen(false);
    } catch (error) {
      console.error("Failed to save cron schedule:", error);
      toast.error("Failed to save cron schedule. Please try again.");
    }
  };

  const handleOpenSetCronDialog = useCallback(() => {
    mutateCronTrigger(); // Ensure cron trigger data is fresh
    setIsIntegrationDialogOpen(true);
  }, [mutateCronTrigger]);

  const displayDeployments = expandedHistory
    ? deployments || []
    : deployments.slice(0, 3) || [];

  const showMoreButton = deployments && deployments.length > 3 && (
    <div className="flex justify-center mt-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setExpandedHistory(!expandedHistory)}
        className="text-xs"
      >
        {expandedHistory ? (
          "Show Less"
        ) : (
          <>
            Show All ({deployments.length}) Deployments
            <ArrowDown className="ml-1 h-3 w-3" />
          </>
        )}
      </Button>
    </div>
  );

  if (isDeploymentHistoryLoading || isWorkflowLoading || isNodeTypesLoading) {
    return (
      <InsetLoading title={workflowSummary?.name || "Workflow Deployments"} />
    );
  } else if (deploymentHistoryError || workflowError) {
    return (
      <InsetError
        title="Workflow Deployments"
        errorMessage={
          "Error loading deployment details: " +
          (deploymentHistoryError?.message ||
            workflowError?.message ||
            "Unknown error")
        }
      />
    );
  }

  return (
    <InsetLayout title={workflowSummary?.name || ""}>
      {workflow ? (
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-muted-foreground">
                Manage deployments for this workflow
              </p>
              <div className="flex gap-2">
                <Button onClick={handleExecuteLatestVersion}>
                  <Play className="mr-2 h-4 w-4" />
                  Execute Latest
                </Button>
                {workflow.type === "http_request" && (
                  <Button onClick={() => setIsIntegrationDialogOpen(true)}>
                    <Globe className="mr-2 h-4 w-4" />
                    Show HTTP Integration
                  </Button>
                )}
                {workflow.type === "email_message" && (
                  <Button onClick={() => setIsIntegrationDialogOpen(true)}>
                    <Mail className="mr-2 h-4 w-4" />
                    Show Email Trigger
                  </Button>
                )}
                {workflow.type === "cron" && (
                  <Button onClick={handleOpenSetCronDialog}>
                    <CalendarClock className="mr-2 h-4 w-4" />
                    Set Schedule
                  </Button>
                )}
              </div>
            </div>
          </div>

          {currentDeployment ? (
            <>
              <WorkflowInfoCard
                id={workflowSummary!.id}
                name={workflowSummary!.name}
                description="Details about the workflow being deployed"
              />

              <DeploymentInfoCard
                id={currentDeployment.id}
                version={currentDeployment.version}
                createdAt={currentDeployment.createdAt}
                title="Current Deployment"
                description="Latest deployment of this workflow"
              />

              <DataTableCard
                title={
                  <div className="flex items-center">
                    <History className="mr-2 h-4 w-4" />
                    Deployment History
                  </div>
                }
                columns={createDeploymentHistoryColumns(
                  currentDeployment?.id || ""
                )}
                data={displayDeployments}
                emptyState={{
                  title: "No deployment history",
                  description: "No deployment history found.",
                }}
              />
              {showMoreButton}
            </>
          ) : (
            <div className="text-center py-10">
              <p className="text-lg">No deployments found for this workflow.</p>
              <Button
                className="mt-4"
                onClick={() => setIsDeployDialogOpen(true)}
              >
                <ArrowUpToLine className="mr-2 h-4 w-4" />
                Deploy Workflow
              </Button>
            </div>
          )}

          {isFormDialogVisible && (
            <ExecutionFormDialog
              isOpen={isFormDialogVisible}
              onClose={closeExecutionForm}
              parameters={executionFormParameters}
              onSubmit={submitFormData}
            />
          )}
        </div>
      ) : (
        <div className="text-center py-10">
          <p className="text-lg">Workflow not found</p>
          <Button
            className="mt-4"
            onClick={() => navigate("/workflows/deployments")}
          >
            Back to Deployments
          </Button>
        </div>
      )}

      {/* Deploy Dialog */}
      <Dialog open={isDeployDialogOpen} onOpenChange={setIsDeployDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deploy Workflow</DialogTitle>
            <DialogDescription>
              This will create a new deployment of "{workflowSummary?.name}".
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeployDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={deployWorkflow}>Deploy</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* HTTP Integration Dialog */}
      {workflow?.type === "http_request" && currentDeployment && (
        <HttpIntegrationDialog
          isOpen={isIntegrationDialogOpen}
          onClose={setIsIntegrationDialogOpen}
          nodes={adaptDeploymentNodesToReactFlowNodes(currentDeployment.nodes)}
          nodeTemplates={nodeTemplates}
          orgHandle={orgHandle}
          workflowId={workflowId!}
          deploymentVersion="latest"
        />
      )}

      {/* Email Trigger Dialog */}
      {workflow?.type === "email_message" && currentDeployment && (
        <EmailTriggerDialog
          isOpen={isIntegrationDialogOpen}
          onClose={setIsIntegrationDialogOpen}
          orgHandle={orgHandle}
          workflowHandle={workflow.handle}
          deploymentVersion="latest"
        />
      )}

      {/* Cron Integration Dialog */}
      {workflow?.type === "cron" && currentDeployment && (
        <SetCronDialog
          isOpen={isIntegrationDialogOpen}
          onClose={() => setIsIntegrationDialogOpen(false)}
          onSubmit={handleSaveCron}
          initialData={{
            cronExpression: cronTrigger?.cronExpression || "",
            active:
              cronTrigger?.active === undefined ? true : cronTrigger.active,
            versionAlias: cronTrigger?.versionAlias || "dev",
            versionNumber: cronTrigger?.versionNumber,
          }}
          deploymentVersions={[currentDeployment.version]}
          workflowName={workflowSummary?.name || ""}
        />
      )}
    </InsetLayout>
  );
}
