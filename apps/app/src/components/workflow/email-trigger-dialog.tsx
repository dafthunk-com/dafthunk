import { Copy } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth-context";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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

  const { workflow, isWorkflowLoading, mutateWorkflow } = useWorkflow(
    workflowId,
    { revalidateOnFocus: false }
  );

  const { emailTrigger, isEmailTriggerLoading, mutateEmailTrigger } =
    useEmailTrigger(workflowId, { revalidateOnFocus: false });

  const { email, isEmailLoading, mutateEmail } = useEmail(
    emailTrigger?.emailId || null
  );

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
  const isDeployed = !!workflow?.activeDeploymentId;

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
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Development</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={devEmailAddress}
                    readOnly
                    className="font-mono"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopyEmail(devEmailAddress)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Label>Production</Label>
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
                    value={prodEmailAddress}
                    readOnly
                    className="font-mono"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopyEmail(prodEmailAddress)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <p className="text-sm text-muted-foreground pt-1">
                {isDeployed
                  ? "Production triggers the deployed version. Development triggers the working version."
                  : "Production requires deployment. Use development to test."}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
