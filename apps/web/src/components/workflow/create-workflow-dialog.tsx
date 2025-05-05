import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export type CreateWorkflowDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateWorkflow: (name: string) => Promise<void>;
};

export function CreateWorkflowDialog({
  open,
  onOpenChange,
  onCreateWorkflow,
}: CreateWorkflowDialogProps) {
  const [newWorkflowName, setNewWorkflowName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateWorkflow = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onCreateWorkflow(newWorkflowName);
    setNewWorkflowName("");
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
          <Button type="submit" className="w-full" disabled={isSubmitting || !newWorkflowName.trim()}>
            {isSubmitting ? "Creating..." : "Create Workflow"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
} 