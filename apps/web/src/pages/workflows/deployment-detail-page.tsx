import type { WorkflowDeploymentVersion } from "@dafthunk/types";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import {
  ArrowDown,
  ArrowUpToLine,
  Clock,
  GitCommitHorizontal,
  History,
  Mail,
  MoreHorizontal,
  Play,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";

import { useAuth } from "@/components/auth-context";
import { ApiIntegrationCard } from "@/components/deployments/api-integration-card";
import { DeploymentInfoCard } from "@/components/deployments/deployment-info-card";
import { WorkflowInfoCard } from "@/components/deployments/workflow-info-card";
import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExecutionFormDialog } from "@/components/workflow/execution-form-dialog";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import {
  createDeployment,
  useDeploymentHistory,
} from "@/services/deployment-service";
import { useWorkflow, useWorkflowExecution } from "@/services/workflow-service";
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
): ColumnDef<WorkflowDeploymentVersion>[] {
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

  // Use empty node templates array since we're in readonly mode
  const nodeTemplates = [];

  const [isDeployDialogOpen, setIsDeployDialogOpen] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState(false);
  const [isApiIntegrationDialogOpen, setIsApiIntegrationDialogOpen] =
    useState(false);

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
      setIsDeploying(true);

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
    } finally {
      setIsDeploying(false);
    }
  };

  const handleExecuteLatestVersion = () => {
    if (!workflowId || !currentDeployment) return;
    executeWorkflow(
      workflowId,
      (execution) => {
        if (execution.status === "submitted") {
          toast.success("Workflow execution submitted");
        } else if (execution.status === "completed") {
          toast.success("Workflow execution completed");
        } else if (execution.status === "error") {
          toast.error("Workflow execution failed");
        }
      },
      adaptDeploymentNodesToReactFlowNodes(currentDeployment.nodes),
      nodeTemplates
    );
  };

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

  const renderIntegrationSection = () => {
    if (!workflow || !currentDeployment) return null;

    switch (workflow.type) {
      case "manual":
        // No integration section for manual workflows
        return null;

      case "http_request":
        return (
          <ApiIntegrationCard
            orgHandle={orgHandle}
            workflowId={workflow.id}
            deploymentVersion="latest"
            nodes={adaptDeploymentNodesToReactFlowNodes(
              currentDeployment.nodes
            )}
            nodeTemplates={nodeTemplates}
          />
        );

      case "email_message":
        const emailAddress = `${workflow.handle}@${orgHandle}.workflows.dafthunk.com`;
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <Mail className="mr-2 h-4 w-4" />
                Email Integration
              </CardTitle>
              <CardDescription>
                Send emails to this address to trigger the workflow
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="email-address">Email Address</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="email-address"
                    value={emailAddress}
                    readOnly
                    className="font-mono h-9"
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(emailAddress);
                      toast.success("Email address copied to clipboard");
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case "cron":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <Clock className="mr-2 h-4 w-4" />
                Cron Integration
              </CardTitle>
              <CardDescription>
                Schedule workflow execution using cron expressions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="cron-expression">Cron Expression</Label>
                <Input
                  id="cron-expression"
                  placeholder="0 0 * * *"
                  disabled
                  className="font-mono"
                />
                <p className="text-sm text-muted-foreground">
                  Cron scheduling is currently disabled and will be available in
                  a future update.
                </p>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  if (isDeploymentHistoryLoading || isWorkflowLoading) {
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
                  Execute Latest Version
                </Button>
                <Button onClick={() => setIsDeployDialogOpen(true)}>
                  <ArrowUpToLine className="mr-2 h-4 w-4" />
                  Deploy Latest Version
                </Button>
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

              {renderIntegrationSection()}

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
            <Button onClick={deployWorkflow} disabled={isDeploying}>
              {isDeploying ? "Deploying..." : "Deploy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* API Integration Dialog */}
      {workflow?.type === "http_request" && currentDeployment && (
        <Dialog
          open={isApiIntegrationDialogOpen}
          onOpenChange={setIsApiIntegrationDialogOpen}
        >
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>API Integration</DialogTitle>
              <DialogDescription>
                Configure HTTP endpoint integration for "{workflowSummary?.name}
                "
              </DialogDescription>
            </DialogHeader>

            <ApiIntegrationCard
              orgHandle={orgHandle}
              workflowId={workflowSummary!.id}
              deploymentVersion="latest"
              nodes={adaptDeploymentNodesToReactFlowNodes(
                currentDeployment.nodes
              )}
              nodeTemplates={nodeTemplates}
            />

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsApiIntegrationDialogOpen(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </InsetLayout>
  );
}
