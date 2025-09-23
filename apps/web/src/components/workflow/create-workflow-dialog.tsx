import { WorkflowType } from "@dafthunk/types";
import Clock from "lucide-react/icons/clock";
import Globe from "lucide-react/icons/globe";
import Mail from "lucide-react/icons/mail";
import Play from "lucide-react/icons/play";
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
import { cn } from "@/utils/utils";

const workflowTypes = [
  {
    type: "manual" as WorkflowType,
    title: "Manual",
    description: "Trigger workflows manually",
    icon: Play,
  },
  {
    type: "http_request" as WorkflowType,
    title: "HTTP Request",
    description: "Trigger workflows via HTTP endpoints",
    icon: Globe,
  },
  {
    type: "email_message" as WorkflowType,
    title: "Email Message",
    description: "Trigger workflows from email messages",
    icon: Mail,
  },
  {
    type: "cron" as WorkflowType,
    title: "Scheduled",
    description: "Trigger workflows on a schedule",
    icon: Clock,
  },
];

export type CreateWorkflowDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateWorkflow: (name: string, type: WorkflowType) => Promise<void>;
};

export function CreateWorkflowDialog({
  open,
  onOpenChange,
  onCreateWorkflow,
}: CreateWorkflowDialogProps) {
  const [newWorkflowName, setNewWorkflowName] = useState("");
  const [workflowType, setWorkflowType] = useState<WorkflowType>("manual");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateWorkflow = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onCreateWorkflow(newWorkflowName, workflowType);
    setNewWorkflowName("");
    setWorkflowType("manual");
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
            <Label>Workflow Type</Label>
            <div className="grid grid-cols-2 gap-4 mt-3">
              {workflowTypes.map((type) => {
                const IconComponent = type.icon;
                return (
                  <div
                    key={type.type}
                    className={cn(
                      "border rounded-lg p-4 transition-all cursor-pointer",
                      workflowType === type.type
                        ? "bg-accent border-primary/50"
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => setWorkflowType(type.type)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-md">
                        <IconComponent className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-sm mb-1">
                          {type.title}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {type.description}
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
