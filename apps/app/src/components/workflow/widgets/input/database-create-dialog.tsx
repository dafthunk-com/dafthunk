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
import { createDatabase } from "@/services/database-service";

interface DatabaseCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (databaseId: string) => void;
}

export function DatabaseCreateDialog({
  isOpen,
  onClose,
  onCreated,
}: DatabaseCreateDialogProps) {
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
    if (!organization?.id) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await createDatabase({ name }, organization.id);
      onCreated(response.id);
      handleClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create database"
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
            Create a Database
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            Give your database a name.
          </DialogDescription>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="database-name">Name</Label>
            <Input
              id="database-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Database"
            />
            <p className="text-xs text-muted-foreground">
              A display name for this database in Dafthunk.
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
                "Create Database"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
