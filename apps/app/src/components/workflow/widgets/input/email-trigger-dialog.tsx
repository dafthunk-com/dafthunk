import { useAuth } from "@/components/auth-context";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useEmail } from "@/services/email-service";
import { useEmailTrigger } from "@/services/workflow-service";

import { EmailSetupInfo } from "./email-setup-info";

interface EmailTriggerDialogProps {
  isOpen: boolean;
  onClose: (open: boolean) => void;
  workflowId: string;
}

export function EmailTriggerDialog({
  isOpen,
  onClose,
  workflowId,
}: EmailTriggerDialogProps) {
  const { organization } = useAuth();
  const orgHandle = organization?.handle || "";

  const { emailTrigger, isEmailTriggerLoading } = useEmailTrigger(workflowId, {
    revalidateOnFocus: false,
  });

  const { email, isEmailLoading } = useEmail(emailTrigger?.emailId || null);

  const isLoading = isEmailTriggerLoading || isEmailLoading;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[550px] max-h-[80vh] flex flex-col gap-0 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <DialogTitle className="text-base font-semibold">
            Email Trigger
          </DialogTitle>
        </div>

        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="h-6 w-6" />
            </div>
          ) : !emailTrigger || !email ? (
            <div className="bg-muted/50 p-3 rounded-md text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">
                No email inbox selected
              </p>
              <p>
                Add a Receive Email node to your workflow and select an email
                inbox to enable email triggers.
              </p>
            </div>
          ) : (
            <EmailSetupInfo handle={email.handle} orgHandle={orgHandle} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
