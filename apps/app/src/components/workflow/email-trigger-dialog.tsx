import Mail from "lucide-react/icons/mail";
import { useEffect } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useEmail } from "@/services/email-service";
import { useEmailTrigger, useWorkflow } from "@/services/workflow-service";

interface EmailTriggerDialogProps {
  isOpen: boolean;
  onClose: (open: boolean) => void;
  workflowId: string;
  emailDomain?: string;
}

export function EmailTriggerDialog({
  isOpen,
  onClose,
  workflowId,
  emailDomain = "dafthunk.com",
}: EmailTriggerDialogProps) {
  const { organization } = useAuth();
  const orgHandle = organization?.handle || "";

  // Fetch workflow to check deployment status
  const { workflow, isWorkflowLoading, mutateWorkflow } = useWorkflow(
    workflowId,
    {
      revalidateOnFocus: false,
    }
  );

  // Fetch email trigger to get the associated emailId
  const { emailTrigger, isEmailTriggerLoading, mutateEmailTrigger } =
    useEmailTrigger(workflowId, {
      revalidateOnFocus: false,
    });

  // Fetch email inbox details to get the handle
  const { email, isEmailLoading, mutateEmail } = useEmail(
    emailTrigger?.emailId || null
  );

  // Revalidate data when dialog opens
  useEffect(() => {
    if (isOpen) {
      mutateWorkflow();
      mutateEmailTrigger();
      if (emailTrigger?.emailId) {
        mutateEmail();
      }
    }
  }, [
    isOpen,
    mutateWorkflow,
    mutateEmailTrigger,
    mutateEmail,
    emailTrigger?.emailId,
  ]);

  const isLoading =
    isWorkflowLoading || isEmailTriggerLoading || isEmailLoading;

  // Check if workflow is deployed
  const isDeployed = !!workflow?.activeDeploymentId;

  // Generate email addresses
  const prodEmailAddress = email
    ? `${orgHandle}+${email.handle}@${emailDomain}`
    : "";
  const devEmailAddress = email
    ? `${orgHandle}+${email.handle}+dev@${emailDomain}`
    : "";

  const handleCopyEmail = (address: string) => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success("Email address copied to clipboard");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Trigger
          </DialogTitle>
          <DialogDescription>
            Send emails to these addresses to trigger the workflow
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="h-6 w-6" />
            </div>
          ) : !emailTrigger || !email ? (
            <div className="bg-muted p-4 rounded-md text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-2">
                No email inbox selected
              </p>
              <p>
                Add a Receive Email node to your workflow and select an email
                inbox to enable email triggers.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="dev-email-address">Development</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="dev-email-address"
                      value={devEmailAddress}
                      readOnly
                      className="font-mono h-9"
                    />
                    <Button
                      variant="outline"
                      onClick={() => handleCopyEmail(devEmailAddress)}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="prod-email-address">Production</Label>
                    {isDeployed ? (
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-md font-medium">
                        Deployed
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-md font-medium">
                        Not Deployed
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      id="prod-email-address"
                      value={prodEmailAddress}
                      readOnly
                      className="font-mono h-9"
                    />
                    <Button
                      variant="outline"
                      onClick={() => handleCopyEmail(prodEmailAddress)}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                {isDeployed
                  ? `Production address triggers the deployed version. Development address triggers the working version. Use the Receive Email node to access email data.`
                  : `Production address requires deployment. Use development address to test. Use the Receive Email node to access email data.`}
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
