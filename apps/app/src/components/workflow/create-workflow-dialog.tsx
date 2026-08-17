import type { WorkflowRuntime, WorkflowTrigger } from "@dafthunk/types";
import ClipboardList from "lucide-react/icons/clipboard-list";
import Clock from "lucide-react/icons/clock";
import FileText from "lucide-react/icons/file-text";
import Globe from "lucide-react/icons/globe";
import Hash from "lucide-react/icons/hash";
import Inbox from "lucide-react/icons/inbox";
import Layers from "lucide-react/icons/layers";
import Mail from "lucide-react/icons/mail";
import MessageCircle from "lucide-react/icons/message-circle";
import MessageSquare from "lucide-react/icons/message-square";
import Play from "lucide-react/icons/play";
import Send from "lucide-react/icons/send";
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
    description: "Run it yourself from the editor",
    icon: Play,
  },
  {
    trigger: "scheduled" as WorkflowTrigger,
    title: "Scheduled",
    description: "Run on a recurring schedule",
    icon: Clock,
  },
  {
    trigger: "http_webhook" as WorkflowTrigger,
    title: "HTTP Webhook",
    description: "Async call, returns an execution ID",
    icon: Webhook,
  },
  {
    trigger: "http_request" as WorkflowTrigger,
    title: "HTTP Request",
    description: "Sync call, waits for the result",
    icon: Globe,
  },
  {
    trigger: "form_webhook" as WorkflowTrigger,
    title: "Form Webhook",
    description: "Public form, runs in the background",
    icon: ClipboardList,
  },
  {
    trigger: "form_request" as WorkflowTrigger,
    title: "Form Request",
    description: "Public form, waits for the result",
    icon: FileText,
  },
  {
    trigger: "email_message" as WorkflowTrigger,
    title: "Email Message",
    description: "Runs on incoming email",
    icon: Mail,
  },
  {
    trigger: "queue_message" as WorkflowTrigger,
    title: "Queue Message",
    description: "Runs on queue messages",
    icon: Inbox,
  },
  {
    trigger: "discord_event" as WorkflowTrigger,
    title: "Discord Event",
    description: "Runs on Discord messages",
    icon: MessageSquare,
  },
  {
    trigger: "telegram_event" as WorkflowTrigger,
    title: "Telegram Event",
    description: "Runs on Telegram messages",
    icon: Send,
  },
  {
    trigger: "whatsapp_event" as WorkflowTrigger,
    title: "WhatsApp Event",
    description: "Runs on WhatsApp messages",
    icon: MessageCircle,
  },
  {
    trigger: "slack_event" as WorkflowTrigger,
    title: "Slack Event",
    description: "Runs on Slack messages",
    icon: Hash,
  },
];

const runtimeTypes = [
  {
    type: "workflow" as WorkflowRuntime,
    title: "Resilient",
    description:
      "Persisted execution that survives failures. Best for long-running workflows.",
    icon: Layers,
  },
  {
    type: "worker" as WorkflowRuntime,
    title: "Responsive",
    description:
      "Immediate execution with lowest latency. Best for quick workflows under 30 seconds.",
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
    try {
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
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Workflow</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreateWorkflow} className="space-y-4">
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
              rows={2}
            />
          </div>
          <div>
            <Label>Trigger Type</Label>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mt-2">
              {workflowTriggers.map((triggerOption) => {
                const IconComponent = triggerOption.icon;
                return (
                  <div
                    key={triggerOption.trigger}
                    className={cn(
                      "border rounded-lg p-3 transition-all cursor-pointer",
                      workflowTrigger === triggerOption.trigger
                        ? "bg-accent border-primary/50"
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => setWorkflowTrigger(triggerOption.trigger)}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                        <IconComponent className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium text-sm leading-7">
                          {triggerOption.title}
                        </h3>
                        <p className="text-xs text-muted-foreground leading-snug">
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
            <div className="grid grid-cols-2 gap-2.5 mt-2">
              {runtimeTypes.map((runtime) => {
                const IconComponent = runtime.icon;
                return (
                  <div
                    key={runtime.type}
                    className={cn(
                      "border rounded-lg p-3 transition-all cursor-pointer",
                      workflowRuntime === runtime.type
                        ? "bg-accent border-primary/50"
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => setWorkflowRuntime(runtime.type)}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                        <IconComponent className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium text-sm leading-7">
                          {runtime.title}
                        </h3>
                        <p className="text-xs text-muted-foreground leading-snug">
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
