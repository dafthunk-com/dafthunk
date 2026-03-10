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
import { createEmail } from "@/services/email-service";

import { EmailSetupInfo } from "../../email-setup-info";

type Step = "name" | "setup";

const STEP_TITLES: Record<Step, string> = {
  name: "Create an Email Inbox",
  setup: "Inbox Created",
};

const STEP_DESCRIPTIONS: Record<Step, string> = {
  name: "Give your inbox a name. An email address will be generated automatically.",
  setup:
    "Your inbox is ready. Use the email addresses below to trigger workflows.",
};

interface EmailCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (emailId: string) => void;
}

export function EmailCreateDialog({
  isOpen,
  onClose,
  onCreated,
}: EmailCreateDialogProps) {
  const { organization } = useAuth();
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdHandle, setCreatedHandle] = useState<string | null>(null);

  const resetForm = () => {
    setStep("name");
    setName("");
    setError(null);
    setCreatedHandle(null);
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
      const response = await createEmail({ name }, organization.handle);
      setCreatedHandle(response.handle);
      setStep("setup");
      onCreated(response.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create inbox");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-[450px]">
        <div>
          <DialogTitle className="text-base font-semibold">
            {STEP_TITLES[step]}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            {STEP_DESCRIPTIONS[step]}
          </DialogDescription>
        </div>

        {step === "name" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email-inbox-name">Name</Label>
              <Input
                id="email-inbox-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Email Inbox"
              />
              <p className="text-xs text-muted-foreground">
                A display name for this inbox in Dafthunk.
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
                  "Create Inbox"
                )}
              </Button>
            </div>
          </div>
        )}

        {step === "setup" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-md font-medium">
                Created
              </span>
              <span className="font-medium">{name}</span>
            </div>

            {createdHandle && organization?.handle && (
              <EmailSetupInfo
                handle={createdHandle}
                orgHandle={organization.handle}
              />
            )}

            <div className="flex justify-end">
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
