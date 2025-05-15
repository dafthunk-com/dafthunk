import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type {
  WorkflowDeploymentVersion,
  Node as BackendNode,
} from "@dafthunk/types";
import {
  ArrowUpToLine,
  History,
  ArrowDown,
  GitCommitHorizontal,
  MoreHorizontal,
} from "lucide-react";
import { DataTableCard } from "@/components/ui/data-table-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import { WorkflowInfoCard } from "@/components/deployments/workflow-info-card";
import { DeploymentInfoCard } from "@/components/deployments/deployment-info-card";
import { ApiIntegrationCard } from "@/components/deployments/api-integration-card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ColumnDef } from "@tanstack/react-table";
import { InsetLoading } from "@/components/inset-loading";
import { InsetError } from "@/components/inset-error";
import { adaptDeploymentNodesToReactFlowNodes } from "@/utils/utils";
import {
  createDeployment,
  useDeploymentHistory,
} from "@/services/deploymentService";
import { executeWorkflow } from "@/services/workflowService";
import { useAuth } from "@/components/authContext";

// --- Inline deployment history columns and helper ---
const formatDeploymentDate = (dateString: string | Date) => {
  try {
    return format(new Date(dateString), "MMM d, yyyy h:mm a");
  } catch (_error) {
    return String(dateString);
  }
};

function createDeploymentHistoryColumns(
  currentDeploymentId: string,
  onExecuteVersion: (workflowId: string, version: string) => void
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
              <DropdownMenuItem
                onClick={() => onExecuteVersion(row.original.workflowId, row.original.version.toString())}
              >
                Execute Version
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

  const {
    workflow,
    deployments,
    historyError: deploymentHistoryError,
    isHistoryLoading: isDeploymentHistoryLoading,
    mutateHistory: mutateDeploymentHistory,
  } = useDeploymentHistory(workflowId!);

  const currentDeployment =
    deployments && deployments.length > 0 ? deployments[0] : null;

  useEffect(() => {
    if (workflow) {
      setBreadcrumbs([
        { label: "Deployments", to: "/workflows/deployments" },
        { label: workflow.name },
      ]);
    } else {
      setBreadcrumbs([
        { label: "Deployments", to: "/workflows/deployments" },
        { label: "Detail" },
      ]);
    }
  }, [workflow, setBreadcrumbs]);

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

  const handleExecuteVersion = async (workflowId: string, version: string) => {
    if (!orgHandle) return;

    try {
      await executeWorkflow(workflowId, orgHandle, { mode: version });
      toast.success("Workflow execution started");
    } catch (error) {
      console.error("Error executing workflow:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to execute workflow. Please try again."
      );
    }
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

  if (isDeploymentHistoryLoading) {
    return <InsetLoading title={workflow?.name || "Workflow Deployments"} />;
  } else if (deploymentHistoryError) {
    return (
      <InsetError
        title="Workflow Deployments"
        errorMessage={
          "Error loading deployment details: " + deploymentHistoryError.message
        }
      />
    );
  }

  return (
    <InsetLayout title={workflow?.name || "Workflow Deployments"}>
      {workflow ? (
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-muted-foreground">
                Manage deployments for this workflow
              </p>
              <div className="flex gap-2">
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
                id={workflow.id}
                name={workflow.name}
                description="Details about the workflow being deployed"
              />

              <DeploymentInfoCard
                id={currentDeployment.id}
                version={currentDeployment.version}
                createdAt={currentDeployment.createdAt}
                title="Current Deployment"
                description="Latest deployment of this workflow"
              />

              {currentDeployment && (
                <ApiIntegrationCard
                  deploymentId={currentDeployment.id}
                  nodes={adaptDeploymentNodesToReactFlowNodes(
                    currentDeployment.nodes
                  )}
                  nodeTemplates={nodeTemplates}
                />
              )}

              <DataTableCard
                title={
                  <div className="flex items-center">
                    <History className="mr-2 h-4 w-4" />
                    Deployment History
                  </div>
                }
                columns={createDeploymentHistoryColumns(
                  currentDeployment?.id || "",
                  handleExecuteVersion
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
              This will create a new deployment of "{workflow?.name}".
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
    </InsetLayout>
  );
}
