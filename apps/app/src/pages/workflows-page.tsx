import type {
  CreateWorkflowRequest,
  WorkflowRuntime,
  WorkflowTrigger,
  WorkflowWithMetadata,
} from "@dafthunk/types";
import { ColumnDef } from "@tanstack/react-table";
import FileDown from "lucide-react/icons/file-down";
import MoreHorizontal from "lucide-react/icons/more-horizontal";
import PlusCircle from "lucide-react/icons/plus-circle";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";

import { useAuth } from "@/components/auth-context";
import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
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
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CreateWorkflowDialog } from "@/components/workflow/create-workflow-dialog";
import { buildInitialTriggerNodes } from "@/components/workflow/trigger-node-mapping";
import { useOrgUrl } from "@/hooks/use-org-url";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import { useNodeTypes } from "@/services/type-service";
import {
  createWorkflow,
  deleteWorkflow,
  getWorkflow,
  updateWorkflow,
  useWorkflows,
} from "@/services/workflow-service";

// --- Inline useWorkflowActions ---
function useWorkflowActions() {
  const { mutateWorkflows } = useWorkflows();
  const { organization } = useAuth();
  const orgId = organization?.id || "";

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] =
    useState<WorkflowWithMetadata | null>(null);
  const [workflowToRename, setWorkflowToRename] =
    useState<WorkflowWithMetadata | null>(null);
  const [renameWorkflowName, setRenameWorkflowName] = useState("");
  const [renameWorkflowDescription, setRenameWorkflowDescription] =
    useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);

  const handleDeleteWorkflow = async () => {
    if (!workflowToDelete || !orgId) return;
    setIsDeleting(true);
    try {
      await deleteWorkflow(workflowToDelete.id, orgId);
      setDeleteDialogOpen(false);
      setWorkflowToDelete(null);
      mutateWorkflows();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRenameWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workflowToRename || !orgId) return;
    setIsRenaming(true);
    try {
      // Fetch the full workflow data with nodes and edges from the server
      const fullWorkflow = await getWorkflow(workflowToRename.id, orgId);

      await updateWorkflow(
        workflowToRename.id,
        {
          name: renameWorkflowName,
          description: renameWorkflowDescription || undefined,
          trigger: fullWorkflow.trigger,
          nodes: fullWorkflow.nodes,
          edges: fullWorkflow.edges,
        },
        orgId
      );
      setRenameDialogOpen(false);
      setWorkflowToRename(null);
      mutateWorkflows();
    } catch (error) {
      console.error("Error updating workflow metadata:", error);
      // Re-throw to show user there was an error
      throw error;
    } finally {
      setIsRenaming(false);
    }
  };

  const deleteDialog = (
    <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Workflow</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "
            {workflowToDelete?.name || "Untitled Workflow"}"? This action cannot
            be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setDeleteDialogOpen(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteWorkflow}
            disabled={isDeleting}
          >
            {isDeleting ? <Spinner className="h-4 w-4 mr-2" /> : null}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const renameDialog = (
    <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Metadata</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleRenameWorkflow} className="space-y-4">
          <div>
            <Label htmlFor="rename-name">Workflow Name</Label>
            <Input
              id="rename-name"
              value={renameWorkflowName}
              onChange={(e) => setRenameWorkflowName(e.target.value)}
              placeholder="Enter workflow name"
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="rename-description">Description (Optional)</Label>
            <Textarea
              id="rename-description"
              value={renameWorkflowDescription}
              onChange={(e) => setRenameWorkflowDescription(e.target.value)}
              placeholder="Describe what you are building"
              className="mt-2"
              maxLength={256}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => setRenameDialogOpen(false)}
              disabled={isRenaming}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isRenaming}>
              {isRenaming ? <Spinner className="h-4 w-4 mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  return {
    deleteDialog,
    renameDialog,
    openDeleteDialog: (workflow: WorkflowWithMetadata) => {
      setWorkflowToDelete(workflow);
      setDeleteDialogOpen(true);
    },
    openRenameDialog: (workflow: WorkflowWithMetadata) => {
      setWorkflowToRename(workflow);
      setRenameWorkflowName(workflow.name || "");
      setRenameWorkflowDescription(workflow.description || "");
      setRenameDialogOpen(true);
    },
  };
}

// --- Inline createColumns ---
function createColumns(
  openDeleteDialog: (workflow: WorkflowWithMetadata) => void,
  openRenameDialog: (workflow: WorkflowWithMetadata) => void,
  navigate: ReturnType<typeof useNavigate>,
  getOrgUrl: (path: string) => string
): ColumnDef<WorkflowWithMetadata>[] {
  return [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        const name = row.getValue("name") as string;
        const workflowId = row.original.id;
        return (
          <Link
            to={getOrgUrl(`workflows/${workflowId}`)}
            className="hover:underline"
          >
            <div className="font-medium">{name || "Untitled Workflow"}</div>
          </Link>
        );
      },
    },
    {
      accessorKey: "trigger",
      header: "Trigger",
      cell: ({ row }) => {
        const trigger = row.getValue("trigger") as WorkflowTrigger;
        const triggerLabels: Record<WorkflowTrigger, string> = {
          manual: "Manual",
          http_webhook: "HTTP Webhook",
          http_request: "HTTP Request",
          email_message: "Email Message",
          scheduled: "Scheduled",
          queue_message: "Queue Message",
          discord_event: "Discord Event",
          telegram_event: "Telegram Event",
          whatsapp_event: "WhatsApp Event",
          slack_event: "Slack Event",
        };
        return (
          <Badge variant="outline" className="text-xs">
            {triggerLabels[trigger]}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const workflow = row.original;
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
                <DropdownMenuItem
                  onClick={() =>
                    navigate(getOrgUrl(`workflows/${workflow.id}`))
                  }
                >
                  Edit Workflow
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openRenameDialog(workflow)}>
                  Edit Metadata
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openDeleteDialog(workflow)}>
                  Delete Workflow
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
}

export function WorkflowsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { setBreadcrumbs } = usePageBreadcrumbs([]);
  const { organization } = useAuth();
  const orgId = organization?.id || "";
  const { getOrgUrl } = useOrgUrl();

  const { workflows, workflowsError, isWorkflowsLoading, mutateWorkflows } =
    useWorkflows();
  const { nodeTypes } = useNodeTypes({ revalidateOnFocus: false });

  const { deleteDialog, renameDialog, openDeleteDialog, openRenameDialog } =
    useWorkflowActions();

  const columns = createColumns(
    openDeleteDialog,
    openRenameDialog,
    navigate,
    getOrgUrl
  );

  useEffect(() => {
    setBreadcrumbs([{ label: "Workflows" }]);
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
      // Optionally show a toast here
    }
  };

  if (isWorkflowsLoading) {
    return <InsetLoading title="Workflows" />;
  } else if (workflowsError) {
    return (
      <InsetError title="Workflows" errorMessage={workflowsError.message} />
    );
  }

  return (
    <TooltipProvider>
      <InsetLayout title="Workflows">
        <div className="flex items-center justify-between mb-6 min-h-10">
          <div className="text-sm text-muted-foreground max-w-2xl">
            Build and test your workflows.
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <PlusCircle className="mr-2 size-4" />
              Create Workflow
            </Button>
            <Button asChild>
              <Link to={getOrgUrl("templates")}>
                <FileDown className="mr-2 size-4" />
                Browse Templates
              </Link>
            </Button>
          </div>
        </div>
        <DataTable
          columns={columns}
          data={workflows || []}
          emptyState={{
            title: "No workflows found",
            description: "Create a new workflow to get started.",
          }}
        />
        <CreateWorkflowDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onCreateWorkflow={handleCreateWorkflow}
        />
        {deleteDialog}
        {renameDialog}
      </InsetLayout>
    </TooltipProvider>
  );
}
