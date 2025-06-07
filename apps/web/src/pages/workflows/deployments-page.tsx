import type { WorkflowDeployment } from "@dafthunk/types";
import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowUpToLine,
  GitCommitHorizontal,
  MoreHorizontal,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

import { useAuth } from "@/components/auth-context";
import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import { DeployButton } from "@/components/workflow/workflow-canvas";
import {
  createDeployment,
  useDeployments,
} from "@/services/deployment-service";
import { useWorkflows } from "@/services/workflow-service";
import { ActionBarGroup } from "@/components/ui/action-bar";

// --- Inline columns and type ---
type DeploymentWithActions = WorkflowDeployment & {
  onViewLatest?: (workflowId: string) => void;
  onCreateDeployment?: (workflowId: string) => void;
};

const columns: ColumnDef<DeploymentWithActions>[] = [
  {
    accessorKey: "workflowName",
    header: "Workflow Name",
    cell: ({ row }) => {
      const workflowName = row.getValue("workflowName") as string;
      const workflowId = row.original.workflowId;
      return (
        <Link
          to={`/workflows/deployments/${workflowId}`}
          className="hover:underline"
        >
          {workflowName}
        </Link>
      );
    },
  },
  {
    accessorKey: "latestVersion",
    header: "Latest Deployment",
    cell: ({ row }) => {
      const deployment = row.original;
      const version = deployment.latestVersion
        ? deployment.latestVersion.toString()
        : "1.0";
      return (
        <TooltipProvider>
          <Link
            to={`/workflows/deployment/${deployment.latestDeploymentId}`}
            className="hover:underline"
          >
            <Badge variant="secondary" className="text-xs gap-1">
              <GitCommitHorizontal className="h-3.5 w-3.5" />v{version}
            </Badge>
          </Link>
        </TooltipProvider>
      );
    },
  },
  {
    accessorKey: "deploymentCount",
    header: "Number of Deployments",
    cell: ({ row }) => {
      const deployment = row.original;
      return (
        <Link
          to={`/workflows/deployments/${deployment.workflowId}`}
          className="hover:underline"
        >
          <Badge variant="outline">{row.getValue("deploymentCount")}</Badge>
        </Link>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const deployment = row.original;
      return (
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
                <Link to={`/workflows/deployments/${deployment.workflowId}`}>
                  View Deployed Versions
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];

export function DeploymentsPage() {
  const navigate = useNavigate();
  const { setBreadcrumbs } = usePageBreadcrumbs([]);
  const { organization } = useAuth();
  const orgHandle = organization?.handle || "";

  // Set breadcrumbs on component mount
  useEffect(() => {
    setBreadcrumbs([{ label: "Deployments" }]);
  }, [setBreadcrumbs]);

  const {
    deployments,
    deploymentsError,
    isDeploymentsLoading,
    mutateDeployments,
  } = useDeployments();

  const { workflows, workflowsError, isWorkflowsLoading } = useWorkflows();

  // Dialog state for workflow deployment
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
    setSelectedWorkflowId("");
  };

  const handleCreateDeployment = async () => {
    if (!selectedWorkflowId || !orgHandle) return;

    setIsCreating(true);
    try {
      await createDeployment(selectedWorkflowId, orgHandle);
      toast.success("Deployment created successfully");
      setIsDialogOpen(false);
      mutateDeployments();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create deployment"
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleViewDeployment = (workflowId: string) => {
    navigate(`/workflows/deployments/${workflowId}`);
  };

  // Add actions to the deployments
  const deploymentsWithActions: DeploymentWithActions[] = (
    deployments || []
  ).map((deployment) => ({
    ...deployment,
    onViewLatest: handleViewDeployment,
    onCreateDeployment: () => {},
  }));

  if (isDeploymentsLoading) {
    return <InsetLoading title="Deployments" />;
  } else if (deploymentsError) {
    return (
      <InsetError title="Deployments" errorMessage={deploymentsError.message} />
    );
  }

  return (
    <TooltipProvider>
      <InsetLayout title="Deployments">
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-muted-foreground max-w-2xl">
            View and manage versioned snapshots of workflows ready for
            execution.
          </div>
          <ActionBarGroup className="[&_button]:h-9">
            <DeployButton onClick={handleOpenDialog} text="Deploy Workflow" />
          </ActionBarGroup>
        </div>
        <DataTable
          columns={columns}
          data={deploymentsWithActions}
          emptyState={{
            title: "No deployments found",
            description: "Deploy a workflow to get started.",
          }}
        />
        {/* Create Deployment Dialog */}
        <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deploy a Workflow</AlertDialogTitle>
              <AlertDialogDescription>
                Select a workflow to create a new deployment (versioned
                snapshot).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="my-4">
              <Select
                value={selectedWorkflowId}
                onValueChange={setSelectedWorkflowId}
                disabled={isWorkflowsLoading || isCreating}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      isWorkflowsLoading
                        ? "Loading workflows..."
                        : "Select a workflow"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {workflowsError ? (
                    <div className="px-3 py-2 text-red-500 text-sm">
                      Error loading workflows: {workflowsError.message}
                    </div>
                  ) : (workflows || []).length === 0 && !isWorkflowsLoading ? (
                    <div className="px-3 py-2 text-muted-foreground text-sm">
                      No workflows available or found.
                    </div>
                  ) : (
                    (workflows || []).map((wf) => (
                      <SelectItem key={wf.id} value={wf.id}>
                        {wf.name || "Untitled Workflow"}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isCreating}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCreateDeployment}
                disabled={
                  !selectedWorkflowId || isCreating || isWorkflowsLoading
                }
                className="bg-primary hover:bg-primary/90"
              >
                {isCreating ? <Spinner className="h-4 w-4 mr-2" /> : null}
                Deploy
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </InsetLayout>
    </TooltipProvider>
  );
}
