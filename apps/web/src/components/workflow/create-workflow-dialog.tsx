import { WorkflowType } from "@dafthunk/types";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
      <DialogContent>
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
            <Label htmlFor="type">Workflow Type</Label>
            <Select
              value={workflowType}
              onValueChange={(value: WorkflowType) => setWorkflowType(value)}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select workflow type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={"manual"}>Manual</SelectItem>
                <SelectItem value={"http_request"}>HTTP Request</SelectItem>
                <SelectItem value={"email_message"}>Email Message</SelectItem>
                <SelectItem value={"cron"}>Scheduled (Cron)</SelectItem>
              </SelectContent>
            </Select>
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
