import type { EndpointMode } from "@dafthunk/types";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { createEndpoint } from "@/services/endpoint-service";

interface EndpointCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (endpointId: string) => void;
}

export function EndpointCreateDialog({
  isOpen,
  onClose,
  onCreated,
}: EndpointCreateDialogProps) {
  const { organization } = useAuth();
  const [name, setName] = useState("");
  const [mode, setMode] = useState<EndpointMode>("webhook");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setName("");
    setMode("webhook");
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
      const response = await createEndpoint(
        { name, mode },
        organization.handle
      );
      onCreated(response.id);
      handleClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create endpoint"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-[450px]">
        <div>
          <DialogTitle className="text-base font-semibold">
            Create an Endpoint
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            Give your endpoint a name and select a mode.
          </DialogDescription>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="endpoint-name">Name</Label>
            <Input
              id="endpoint-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Endpoint"
            />
            <p className="text-xs text-muted-foreground">
              A display name for this endpoint in Dafthunk.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="endpoint-mode">Mode</Label>
            <Select
              value={mode}
              onValueChange={(v) => setMode(v as EndpointMode)}
            >
              <SelectTrigger id="endpoint-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="webhook">
                  Webhook (async, returns execution ID)
                </SelectItem>
                <SelectItem value="request">
                  Request (sync, returns response)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Webhook triggers execute asynchronously. Request triggers wait for
              a response.
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
                "Create Endpoint"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
