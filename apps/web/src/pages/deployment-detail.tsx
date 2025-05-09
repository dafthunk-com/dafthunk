import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { WorkflowDeploymentVersion } from "@dafthunk/types";
import { API_BASE_URL } from "@/config/api";
import {
  ArrowUpToLine,
  History,
  ArrowDown,
  GitCommitHorizontal,
  MoreHorizontal,
  Play,
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
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ColumnDef } from "@tanstack/react-table";
import { InsetLoading } from "@/components/inset-loading";
import { useFetch } from "@/hooks/use-fetch";
import { InsetError } from "@/components/inset-error";
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
                  to={`/workflows/deployments/version/${deployment.id}`}
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
                to={`/workflows/deployments/version/${deployment.id}`}
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
          to={`/workflows/deployments/version/${row.original.id}`}
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
                <Link to={`/workflows/deployments/version/${row.original.id}`}>
                  View Version
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  try {
                    const response = await fetch(
                      `${API_BASE_URL}/deployments/version/${row.original.id}/execute`,
                      {
                        method: "GET",
                        credentials: "include",
                      }
                    );
                    if (!response.ok) {
                      throw new Error(
                        `Failed to execute deployment: ${response.statusText}`
                      );
                    }
                    toast.success("Deployment executed successfully");
                  } catch (error) {
                    console.error("Error executing deployment:", error);
                    toast.error(
                      "Failed to execute deployment. Please try again."
                    );
                  }
                }}
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

  const { setBreadcrumbs } = usePageBreadcrumbs([]);

  const [isDeployDialogOpen, setIsDeployDialogOpen] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState(false);

  const {
    deploymentHistory,
    deploymentHistoryError,
    isDeploymentHistoryLoading,
    mutateDeploymentHistory,
  } = useFetch.useDeploymentHistory(workflowId!);

  const workflow = deploymentHistory?.workflow;
  const currentDeployment =
    deploymentHistory && deploymentHistory?.deployments.length > 0
      ? deploymentHistory.deployments[0]
      : null;

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
    if (!workflowId) return;

    try {
      setIsDeploying(true);
      const response = await fetch(
        `${API_BASE_URL}/deployments/${workflowId}`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
            `Failed to deploy workflow: ${response.statusText}`
        );
      }

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

  const executeLatestVersion = async () => {
    if (!currentDeployment?.id) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/deployments/version/${currentDeployment.id}/execute`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
            `Failed to execute deployment: ${response.statusText}`
        );
      }

      toast.success("Deployment executed successfully");
    } catch (error) {
      console.error("Error executing deployment:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to execute deployment. Please try again."
      );
    }
  };

  const displayDeployments = expandedHistory
    ? deploymentHistory?.deployments || []
    : deploymentHistory?.deployments.slice(0, 3) || [];

  const showMoreButton = deploymentHistory?.deployments.length &&
    deploymentHistory?.deployments.length > 3 && (
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
              Show All ({deploymentHistory?.deployments.length}) Deployments
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
                <Button
                  onClick={executeLatestVersion}
                  disabled={!currentDeployment}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Execute Latest Version
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

              <DataTableCard
                title={
                  <div className="flex items-center">
                    <History className="mr-2 h-4 w-4" />
                    Deployment History
                  </div>
                }
                columns={createDeploymentHistoryColumns(currentDeployment.id)}
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
