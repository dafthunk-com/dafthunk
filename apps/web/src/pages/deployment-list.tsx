import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { DataTable } from "@/components/ui/data-table";
import { TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";
import type { WorkflowDeployment, Node as BackendNode, Parameter as BackendParameter } from "@dafthunk/types";
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
import { InsetLoading } from "@/components/inset-loading";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import {
  MoreHorizontal,
  GitCommitHorizontal,
  ArrowUpToLine,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDeployments, useWorkflows, useNodeTemplates } from "@/hooks/use-fetch";
import { InsetError } from "@/components/inset-error";
import { deploymentService } from "@/services/deploymentService";
import {
  ExecutionFormDialog,
  type DialogFormParameter
} from "@/components/workflow/execution-form-dialog";
import { extractDialogParametersFromNodes } from "@/utils/utils";
import type { Node } from "@xyflow/react";
import type { WorkflowNodeType, WorkflowParameter } from "@/components/workflow/workflow-types.tsx";

// --- Inline columns and type ---
type DeploymentWithActions = WorkflowDeployment & {
  onViewLatest?: (workflowId: string) => void;
  onCreateDeployment?: (workflowId: string) => void;
  onExecute?: (deploymentId: string) => void;
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
          to={`/workflows/playground/${workflowId}`}
          className="hover:underline"
        >
          {workflowName}
        </Link>
      );
    },
  },
  {
    accessorKey: "workflowId",
    header: "Workflow UUID",
    cell: ({ row }) => {
      const workflowId = row.original.workflowId;
      return (
        <Link
          to={`/workflows/playground/${workflowId}`}
          className="font-mono text-xs hover:underline"
        >
          {workflowId}
        </Link>
      );
    },
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
          <Link
            to={`/workflows/deployments/version/${deployment.latestDeploymentId}`}
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
              <DropdownMenuItem
                onClick={() =>
                  deployment.onExecute?.(deployment.latestDeploymentId || "")
                }
                disabled={!deployment.latestDeploymentId}
              >
                Execute Latest Version
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];

export function DeploymentListPage() {
  const navigate = useNavigate();
  const { setBreadcrumbs } = usePageBreadcrumbs([]);

  // Dialog state
  const [showExecutionForm, setShowExecutionForm] = useState(false);
  const [formParameters, setFormParameters] = useState<DialogFormParameter[]>([]);
  const executionContextRef = useRef<{ deploymentId: string } | null>(null);
  const [isExecutingId, setIsExecutingId] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState("");
  const [isCreating, setIsCreating] = useState(false);

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

  const { nodeTemplates } = useNodeTemplates();

  // Adapter function to convert BackendNode to ReactFlowNode for the utility function
  const adaptDeploymentNodesToReactFlowNodes = useCallback(
    (backendNodes: BackendNode[]): Node<WorkflowNodeType>[] => {
      return (backendNodes || []).map(depNode => {
        const adaptedInputs: WorkflowParameter[] = (depNode.inputs || []).map((param: BackendParameter) => {
          return {
            id: param.name,
            name: param.name,
            type: param.type,
            value: (param as any).value,
            description: param.description,
            hidden: param.hidden,
            required: param.required,
          };
        });

        return {
          id: depNode.id,
          type: 'workflowNode',
          position: depNode.position || { x: 0, y: 0 },
          data: {
            nodeType: depNode.type,
            name: depNode.name,
            inputs: adaptedInputs,
            outputs: [],
            executionState: 'idle',
          },
        } as Node<WorkflowNodeType>;
      });
    }, []);

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
    setSelectedWorkflowId("");
  };

  const handleCreateDeployment = async () => {
    if (!selectedWorkflowId) return;
    setIsCreating(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/deployments/${selectedWorkflowId}`,
        {
          method: "POST",
          credentials: "include",
        }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create deployment");
      }
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

  // Shared execution logic for this page
  const performActualDeploymentExecutionOnPage = async (deploymentId: string, requestBody?: Record<string, any>) => {
    setIsExecutingId(deploymentId);
    toast.info("Initiating deployment execution...");
    try {
      const response = await fetch(
        `${API_BASE_URL}/deployments/version/${deploymentId}/execute`,
        {
          method: "POST",
          credentials: "include",
          headers: requestBody && Object.keys(requestBody).length > 0 ? { "Content-Type": "application/json" } : {},
          body: requestBody && Object.keys(requestBody).length > 0 ? JSON.stringify(requestBody) : undefined,
        }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to execute deployment: ${response.statusText} (Status: ${response.status})`);
      }
      const executionResult = await response.json();
      toast.success(`Deployment execution started successfully. Execution ID: ${executionResult.id}`);
    } catch (error) {
      console.error("Error executing deployment:", error);
      toast.error(error instanceof Error ? error.message : "Failed to execute deployment. Please try again.");
    } finally {
      setIsExecutingId(null);
    }
  };

  const handleExecute = useCallback(async (deploymentId: string | null) => {
    if (!deploymentId) {
      toast.error("Deployment ID is not available.");
      return;
    }
    setIsExecutingId(deploymentId);

    try {
      // Step 1: Fetch the specific deployment version to get its nodes
      const deploymentVersionData = await deploymentService.getVersion(deploymentId);
      if (!deploymentVersionData || !deploymentVersionData.nodes) {
        toast.error("Could not fetch deployment details or nodes are missing.");
        setIsExecutingId(null);
        return;
      }

      // Step 2: Use the adapter and utility function
      const currentTemplates = nodeTemplates || [];
      const adaptedNodes = adaptDeploymentNodesToReactFlowNodes(deploymentVersionData.nodes);
      const httpParameterNodes = extractDialogParametersFromNodes(adaptedNodes, currentTemplates);

      if (httpParameterNodes.length > 0) {
        setFormParameters(httpParameterNodes);
        executionContextRef.current = { deploymentId };
        setShowExecutionForm(true);
      } else {
        performActualDeploymentExecutionOnPage(deploymentId, {});
      }

    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to prepare execution. Could not fetch deployment details.");
      setIsExecutingId(null);
    }
  }, [nodeTemplates, performActualDeploymentExecutionOnPage, adaptDeploymentNodesToReactFlowNodes]);

  // Add actions to the deployments
  const deploymentsWithActions: DeploymentWithActions[] = (
    deployments || []
  ).map((deployment) => ({
    ...deployment,
    onViewLatest: handleViewDeployment,
    onCreateDeployment: () => {},
    onExecute: handleExecute,
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
          <Button onClick={handleOpenDialog}>
            <ArrowUpToLine className="mr-2 h-4 w-4" />
            Deploy Workflow
          </Button>
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

        {/* Execution Parameters Dialog */}
        {showExecutionForm && (
          <ExecutionFormDialog
            isOpen={showExecutionForm}
            onClose={() => {
              setShowExecutionForm(false);
              setIsExecutingId(null);
            }}
            parameters={formParameters}
            onSubmit={(formData) => {
              setShowExecutionForm(false);
              if (executionContextRef.current) {
                performActualDeploymentExecutionOnPage(executionContextRef.current.deploymentId, formData);
              } else {
                setIsExecutingId(null);
              }
            }}
          />
        )}
      </InsetLayout>
    </TooltipProvider>
  );
}
