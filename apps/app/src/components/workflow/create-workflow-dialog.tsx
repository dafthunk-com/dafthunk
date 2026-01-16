import type { WorkflowRuntime, WorkflowTrigger } from "@dafthunk/types";
import Clock from "lucide-react/icons/clock";
import Globe from "lucide-react/icons/globe";
import Inbox from "lucide-react/icons/inbox";
import Layers from "lucide-react/icons/layers";
import Mail from "lucide-react/icons/mail";
import Play from "lucide-react/icons/play";
import Webhook from "lucide-react/icons/webhook";
import Zap from "lucide-react/icons/zap";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/utils/utils";

const workflowTriggers = [
  {
    trigger: "manual" as WorkflowTrigger,
    title: "Manual",
    description: "Trigger workflows manually",
    icon: Play,
  },
  {
    trigger: "scheduled" as WorkflowTrigger,
    title: "Scheduled",
    description: "Trigger workflows on a schedule",
    icon: Clock,
  },
  {
    trigger: "http_webhook" as WorkflowTrigger,
    title: "HTTP Webhook",
    description: "Async HTTP trigger, returns execution ID immediately",
    icon: Webhook,
  },
  {
    trigger: "http_request" as WorkflowTrigger,
    title: "HTTP Request",
    description: "Sync HTTP trigger, waits for workflow completion",
    icon: Globe,
  },
  {
    trigger: "email_message" as WorkflowTrigger,
    title: "Email Message",
    description: "Trigger workflows from email messages",
    icon: Mail,
  },
  {
    trigger: "queue_message" as WorkflowTrigger,
    title: "Queue Message",
    description: "Trigger workflows from queue messages",
    icon: Inbox,
  },
];

const runtimeTypes = [
  {
    type: "workflow" as WorkflowRuntime,
    title: "Durable",
    description: "Reliable execution with retries and checkpoints",
    icon: Layers,
  },
  {
    type: "worker" as WorkflowRuntime,
    title: "Fast",
    description: "Low-latency execution without durability, max 30s",
    icon: Zap,
  },
];

export type CreateWorkflowDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateWorkflow: (
    name: string,
    trigger: WorkflowTrigger,
    description?: string,
    runtime?: WorkflowRuntime
  ) => Promise<void>;
};

export function CreateWorkflowDialog({
  open,
  onOpenChange,
  onCreateWorkflow,
}: CreateWorkflowDialogProps) {
  const [newWorkflowName, setNewWorkflowName] = useState("");
  const [newWorkflowDescription, setNewWorkflowDescription] = useState("");
  const [workflowTrigger, setWorkflowTrigger] =
    useState<WorkflowTrigger>("manual");
  const [workflowRuntime, setWorkflowRuntime] =
    useState<WorkflowRuntime>("workflow");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateWorkflow = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onCreateWorkflow(
      newWorkflowName,
      workflowTrigger,
      newWorkflowDescription || undefined,
      workflowRuntime
    );
    setNewWorkflowName("");
    setNewWorkflowDescription("");
    setWorkflowTrigger("manual");
    setWorkflowRuntime("workflow");
    setIsSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Workflow</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreateWorkflow} className="space-y-6">
          <div>
            <Label htmlFor="name">Workflow Name</Label>
            <Input
              id="name"
              value={newWorkflowName}
              onChange={(e) => setNewWorkflowName(e.target.value)}
              placeholder="Enter workflow name"
              className="mt-2"
              required
              minLength={2}
              maxLength={64}
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={newWorkflowDescription}
              onChange={(e) => setNewWorkflowDescription(e.target.value)}
              placeholder="Describe what you are building"
              className="mt-2"
              maxLength={256}
              rows={3}
            />
          </div>
          <div>
            <Label>Trigger Type</Label>
            <div className="grid grid-cols-2 gap-4 mt-3">
              {workflowTriggers.map((triggerOption) => {
                const IconComponent = triggerOption.icon;
                return (
                  <div
                    key={triggerOption.trigger}
                    className={cn(
                      "border rounded-lg p-4 transition-all cursor-pointer",
                      workflowTrigger === triggerOption.trigger
                        ? "bg-accent border-primary/50"
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => setWorkflowTrigger(triggerOption.trigger)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-md">
                        <IconComponent className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-sm mb-1">
                          {triggerOption.title}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {triggerOption.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <Label>Execution Mode</Label>
            <div className="grid grid-cols-2 gap-4 mt-3">
              {runtimeTypes.map((runtime) => {
                const IconComponent = runtime.icon;
                return (
                  <div
                    key={runtime.type}
                    className={cn(
                      "border rounded-lg p-4 transition-all cursor-pointer",
                      workflowRuntime === runtime.type
                        ? "bg-accent border-primary/50"
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => setWorkflowRuntime(runtime.type)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-md">
                        <IconComponent className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-sm mb-1">
                          {runtime.title}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {runtime.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || !newWorkflowName.trim()}
          >
            {isSubmitting ? "Creating..." : "Create Workflow"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
