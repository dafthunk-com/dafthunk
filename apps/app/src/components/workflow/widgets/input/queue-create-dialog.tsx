import { useState } from "react";

import { useAuth } from "@/components/auth-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { createQueue } from "@/services/queue-service";

interface QueueCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (queueId: string) => void;
}

export function QueueCreateDialog({
  isOpen,
  onClose,
  onCreated,
}: QueueCreateDialogProps) {
  const { organization } = useAuth();
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setName("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!organization?.handle) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await createQueue({ name }, organization.handle);
      onCreated(response.id);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create queue");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-[450px]">
        <div>
          <DialogTitle className="text-base font-semibold">
            Create a Queue
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            Give your queue a name. A publish endpoint will be generated
            automatically.
          </DialogDescription>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="queue-name">Name</Label>
            <Input
              id="queue-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Queue"
            />
            <p className="text-xs text-muted-foreground">
              A display name for this queue in Dafthunk.
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || name.trim() === ""}
            >
              {isSubmitting ? (
                <>
                  <Spinner className="h-4 w-4 mr-1" />
                  Creating...
                </>
              ) : (
                "Create Queue"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
