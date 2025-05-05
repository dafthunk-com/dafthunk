import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { DataTable } from "@/components/ui/data-table";
import { TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { WorkflowDeployment, Workflow } from "@dafthunk/types";
import { API_BASE_URL } from "@/config/api";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { workflowService } from "@/services/workflowService";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { GitCommitHorizontal, Eye, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// --- Inline columns and type ---
type DeploymentWithActions = WorkflowDeployment & {
  onViewLatest?: (workflowId: string) => void;
  onCreateDeployment?: (workflowId: string) => void;
};

const columns: ColumnDef<DeploymentWithActions>[] = [
  {
    accessorKey: "workflowName",
    header: "Workflow Name",
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("workflowName")}</div>
    ),
  },
  {
    accessorKey: "latestVersion",
    header: "Latest Deployment Version",
    cell: ({ row }) => {
      const deployment = row.original;
      const version = deployment.latestVersion
        ? deployment.latestVersion.toString()
        : "1.0";
      return (
        <TooltipProvider>
          <Badge variant="secondary" className="text-xs gap-1">
            <GitCommitHorizontal className="h-3.5 w-3.5" />v{version}
          </Badge>
        </TooltipProvider>
      );
    },
  },
  {
    accessorKey: "deploymentCount",
    header: "Number of Deployments",
    cell: ({ row }) => (
      <Badge variant="outline">{row.getValue("deploymentCount")}</Badge>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const deployment = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to={`/workflows/deployments/${deployment.workflowId}`}>View</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export function DeploymentListPage() {
  const navigate = useNavigate();
  const { setBreadcrumbs } = usePageBreadcrumbs([]);
  const [deployments, setDeployments] = useState<WorkflowDeployment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isWorkflowsLoading, setIsWorkflowsLoading] = useState(false);

  // Set breadcrumbs on component mount
  useEffect(() => {
    setBreadcrumbs([{ label: "Deployments" }]);
  }, [setBreadcrumbs]);

  // Fetch the deployments
  const fetchDeployments = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/deployments`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch deployments: ${response.statusText}`);
      }
      const data = await response.json();
      setDeployments(data.workflows);
    } catch (error) {
      console.error("Error fetching deployments:", error);
      toast.error("Failed to fetch deployments. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeployments();
  }, [fetchDeployments]);

  // Fetch all workflows for the select
  const fetchWorkflows = useCallback(async () => {
    setIsWorkflowsLoading(true);
    try {
      const all = await workflowService.getAll();
      setWorkflows(all);
    } catch {
      toast.error("Failed to fetch workflows");
    } finally {
      setIsWorkflowsLoading(false);
    }
  }, []);

  // Open dialog and fetch workflows
  const handleOpenDialog = () => {
    setIsDialogOpen(true);
    setSelectedWorkflowId("");
    fetchWorkflows();
  };

  // Create deployment
  const handleCreateDeployment = async () => {
    if (!selectedWorkflowId) return;
    setIsCreating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/deployments/${selectedWorkflowId}`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to create deployment");
      toast.success("Deployment created successfully");
      setIsDialogOpen(false);
      fetchDeployments();
    } catch {
      toast.error("Failed to create deployment");
    } finally {
      setIsCreating(false);
    }
  };

  const handleViewDeployment = (workflowId: string) => {
    navigate(`/workflows/deployments/${workflowId}`);
  };

  // Add actions to the deployments
  const deploymentsWithActions: DeploymentWithActions[] = deployments.map(
    (deployment) => ({
      ...deployment,
      onViewLatest: handleViewDeployment,
      onCreateDeployment: () => {},
    })
  );

  return (
    <TooltipProvider>
      <InsetLayout title="Deployments">
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-muted-foreground max-w-2xl">
            View and manage versioned snapshots of workflows ready for execution.
          </div>
          <Button onClick={handleOpenDialog} size="sm">
            + Create Deployment
          </Button>
        </div>
        <DataTable
          columns={columns}
          data={deploymentsWithActions}
          isLoading={isLoading}
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
                Select a workflow to create a new deployment (versioned snapshot).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="my-4">
              <Select
                value={selectedWorkflowId}
                onValueChange={setSelectedWorkflowId}
                disabled={isWorkflowsLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={isWorkflowsLoading ? "Loading..." : "Select a workflow"} />
                </SelectTrigger>
                <SelectContent>
                  {workflows.length === 0 && !isWorkflowsLoading ? (
                    <div className="px-3 py-2 text-muted-foreground text-sm">No workflows found</div>
                  ) : (
                    workflows.map((wf) => (
                      <SelectItem key={wf.id} value={wf.id}>
                        {wf.name}
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
                disabled={!selectedWorkflowId || isCreating || isWorkflowsLoading}
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
