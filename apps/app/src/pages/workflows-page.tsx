import type {
  CreateWorkflowRequest,
  WorkflowRuntime,
  WorkflowTrigger,
  WorkflowWithMetadata,
} from "@dafthunk/types";
import type { LucideIcon } from "lucide-react";
import ClipboardList from "lucide-react/icons/clipboard-list";
import Clock from "lucide-react/icons/clock";
import FileDown from "lucide-react/icons/file-down";
import FileText from "lucide-react/icons/file-text";
import Globe from "lucide-react/icons/globe";
import Hash from "lucide-react/icons/hash";
import Inbox from "lucide-react/icons/inbox";
import Mail from "lucide-react/icons/mail";
import MessageCircle from "lucide-react/icons/message-circle";
import MessageSquare from "lucide-react/icons/message-square";
import MoreHorizontal from "lucide-react/icons/more-horizontal";
import Play from "lucide-react/icons/play";
import PlusCircle from "lucide-react/icons/plus-circle";
import Send from "lucide-react/icons/send";
import Wand from "lucide-react/icons/wand";
import Webhook from "lucide-react/icons/webhook";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";

import { useAuth } from "@/components/auth-context";
import { InsetError } from "@/components/inset-error";
import { InsetLoading } from "@/components/inset-loading";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { TagFilterButtons } from "@/components/ui/tag-filter-buttons";
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
import { formatRelativeDate } from "@/utils/date";

const triggerMeta: Record<
  WorkflowTrigger,
  { label: string; icon: LucideIcon }
> = {
  manual: { label: "Manual", icon: Play },
  scheduled: { label: "Scheduled", icon: Clock },
  http_webhook: { label: "HTTP Webhook", icon: Webhook },
  http_request: { label: "HTTP Request", icon: Globe },
  form_webhook: { label: "Form Webhook", icon: ClipboardList },
  form_request: { label: "Form Request", icon: FileText },
  email_message: { label: "Email Message", icon: Mail },
  queue_message: { label: "Queue Message", icon: Inbox },
  discord_event: { label: "Discord Event", icon: MessageSquare },
  telegram_event: { label: "Telegram Event", icon: Send },
  whatsapp_event: { label: "WhatsApp Event", icon: MessageCircle },
  slack_event: { label: "Slack Event", icon: Hash },
};

function highlightMatch(text: string, searchTerm: string) {
  if (!searchTerm.trim()) return text;

  const words = searchTerm
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .filter((word) => word.length > 0);

  if (words.length === 0) return text;

  const regex = new RegExp(`(${words.join("|")})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (words.some((word) => new RegExp(`^${word}$`, "i").test(part))) {
      return (
        <mark
          key={index}
          className="bg-yellow-200 dark:bg-yellow-900 font-semibold"
        >
          {part}
        </mark>
      );
    }
    return part;
  });
}

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

export function WorkflowsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTrigger, setSelectedTrigger] = useState<string | null>(null);
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

  useEffect(() => {
    setBreadcrumbs([{ label: "Workflows" }]);
  }, [setBreadcrumbs]);

  const searchFilteredWorkflows = useMemo(() => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return workflows;
    return workflows.filter(
      (w) =>
        w.name.toLowerCase().includes(term) ||
        (w.description ?? "").toLowerCase().includes(term)
    );
  }, [workflows, searchQuery]);

  const filteredWorkflows = useMemo(() => {
    const sorted = [...searchFilteredWorkflows].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    if (!selectedTrigger) return sorted;
    return sorted.filter((w) => w.trigger === selectedTrigger);
  }, [searchFilteredWorkflows, selectedTrigger]);

  const triggerCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const w of searchFilteredWorkflows) {
      counts[w.trigger] = (counts[w.trigger] || 0) + 1;
    }
    return Object.entries(counts)
      .sort(([a, ca], [b, cb]) => {
        if (cb !== ca) return cb - ca;
        return a.localeCompare(b);
      })
      .map(([tag, count]) => ({ tag, count }));
  }, [searchFilteredWorkflows]);

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

  if (isWorkflowsLoading) {
    return <InsetLoading title="Workflows" />;
  } else if (workflowsError) {
    return (
      <InsetError title="Workflows" errorMessage={workflowsError.message} />
    );
  }

  return (
    <TooltipProvider>
      <InsetLayout title="Workflows" childrenClassName="flex flex-col h-full">
        <div className="flex items-center justify-between mb-4 min-h-10">
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

        <div className="flex flex-col gap-4 min-h-0 flex-1">
          <div className="relative shrink-0">
            <Input
              placeholder="Search workflows..."
              className="pl-4 text-base h-12"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-4 flex-1 min-h-0">
            <div className="flex-1 min-h-0">
              <ScrollArea className="h-full">
                {filteredWorkflows.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Wand className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">
                      {workflows.length === 0
                        ? "No workflows found. Create a new workflow to get started."
                        : "No workflows match your search."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 pr-4">
                    {filteredWorkflows.map((workflow) => (
                      <WorkflowCard
                        key={workflow.id}
                        workflow={workflow}
                        searchQuery={searchQuery}
                        href={getOrgUrl(`workflows/${workflow.id}`)}
                        executionsHref={getOrgUrl(
                          `executions?workflowId=${workflow.id}`
                        )}
                        feedbackHref={getOrgUrl(
                          `feedback?workflowId=${workflow.id}`
                        )}
                        onRename={openRenameDialog}
                        onDelete={openDeleteDialog}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {triggerCounts.length > 1 && (
              <div className="w-72 shrink-0">
                <TagFilterButtons
                  categories={triggerCounts.map(({ tag, count }) => ({
                    tag,
                    count,
                  }))}
                  selectedTag={selectedTrigger}
                  onTagChange={setSelectedTrigger}
                  totalCount={searchFilteredWorkflows.length}
                />
                <div className="text-xs text-muted-foreground/60 pt-3 text-right">
                  {filteredWorkflows.length} of {workflows.length} workflows
                </div>
              </div>
            )}
          </div>
        </div>

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

function WorkflowCard({
  workflow,
  searchQuery,
  href,
  executionsHref,
  feedbackHref,
  onRename,
  onDelete,
}: {
  workflow: WorkflowWithMetadata;
  searchQuery: string;
  href: string;
  executionsHref: string;
  feedbackHref: string;
  onRename: (workflow: WorkflowWithMetadata) => void;
  onDelete: (workflow: WorkflowWithMetadata) => void;
}) {
  const meta = triggerMeta[workflow.trigger];
  const Icon = meta.icon;
  const workflowName = workflow.name || "Untitled Workflow";

  return (
    <Card className="relative group hover:border-primary/50 transition-colors">
      <Link
        to={href}
        aria-label={`Open ${workflowName}`}
        className="absolute inset-0 rounded-lg"
      />
      <CardContent className="relative flex items-start gap-4 p-4 min-w-0 pointer-events-none">
        <Icon className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 pr-10">
          <h3 className="font-semibold text-sm leading-tight mb-1">
            {highlightMatch(workflowName, searchQuery)}
          </h3>
          {workflow.description && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              {highlightMatch(workflow.description, searchQuery)}
            </p>
          )}
        </div>
      </CardContent>
      <CardFooter className="relative justify-between gap-3 px-4 py-2 border-t bg-muted/50 rounded-b-lg text-xs text-muted-foreground pointer-events-none">
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate">{meta.label}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">
            Updated {formatRelativeDate(workflow.updatedAt)}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to={executionsHref}
            className="hover:text-foreground hover:underline pointer-events-auto"
          >
            Executions
          </Link>
          <span aria-hidden="true">·</span>
          <Link
            to={feedbackHref}
            className="hover:text-foreground hover:underline pointer-events-auto"
          >
            Feedback
          </Link>
        </div>
      </CardFooter>
      <div className="absolute top-3 right-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem asChild>
              <Link to={href}>Edit Workflow</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRename(workflow)}>
              Edit Metadata
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(workflow)}>
              Delete Workflow
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
