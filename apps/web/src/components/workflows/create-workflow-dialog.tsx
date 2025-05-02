import { useState } from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PlusIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

interface CreateWorkflowDialogProps {
  onCreateWorkflow: (name: string) => Promise<void>;
  buttonProps?: ButtonProps;
}

export function CreateWorkflowDialog({
  onCreateWorkflow,
  buttonProps,
}: CreateWorkflowDialogProps) {
  const [open, setOpen] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState("");

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    await onCreateWorkflow(newWorkflowName);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button {...buttonProps}>
          <PlusIcon className="mr-2 h-4 w-4" />
          New Workflow
        </Button>
      </DialogTrigger>
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
            />
          </div>
          <Button type="submit" className="w-full">
            Create Workflow
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
