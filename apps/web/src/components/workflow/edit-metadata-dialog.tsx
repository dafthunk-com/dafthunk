import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

export interface EditMetadataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName: string;
  initialDescription?: string;
  onSave: (name: string, description?: string) => Promise<void>;
}

export function EditMetadataDialog({
  open,
  onOpenChange,
  initialName,
  initialDescription,
  onSave,
}: EditMetadataDialogProps) {
  const [workflowName, setWorkflowName] = useState(initialName);
  const [workflowDescription, setWorkflowDescription] = useState(
    initialDescription || ""
  );
  const [isSaving, setIsSaving] = useState(false);

  // Reset state when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setWorkflowName(initialName);
      setWorkflowDescription(initialDescription || "");
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(workflowName, workflowDescription || undefined);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Metadata</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="workflow-name">Workflow Name</Label>
            <Input
              id="workflow-name"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              placeholder="Enter workflow name"
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="workflow-description">Description (Optional)</Label>
            <Textarea
              id="workflow-description"
              value={workflowDescription}
              onChange={(e) => setWorkflowDescription(e.target.value)}
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
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Spinner className="h-4 w-4 mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
