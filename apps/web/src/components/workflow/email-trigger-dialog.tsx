import Mail from "lucide-react/icons/mail";
import { toast } from "sonner";

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

interface EmailTriggerDialogProps {
  isOpen: boolean;
  onClose: (open: boolean) => void;
  orgHandle: string;
  workflowHandle: string;
  deploymentVersion?: string;
  emailDomain?: string;
}

export function EmailTriggerDialog({
  isOpen,
  onClose,
  orgHandle,
  workflowHandle,
  deploymentVersion,
  emailDomain = "dafthunk.com",
}: EmailTriggerDialogProps) {
  let emailAddress = `workflow+${orgHandle}+${workflowHandle}`;
  if (deploymentVersion && deploymentVersion !== "latest") {
    emailAddress += `+${deploymentVersion}`;
  }
  emailAddress += `@${emailDomain}`;

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(emailAddress);
    toast.success("Email address copied to clipboard");
  };

  const description = deploymentVersion
    ? `Send emails to this address to trigger version ${deploymentVersion} of the workflow.`
    : "Send emails to this address to trigger the workflow. This will always trigger the latest deployed version of the workflow.";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Trigger
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-address">Workflow Email Address</Label>
            <div className="flex items-center gap-2">
              <Input
                id="email-address"
                value={emailAddress}
                readOnly
                className="font-mono h-9"
              />
              <Button variant="outline" onClick={handleCopyEmail}>
                Copy
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">How it works:</h4>
              <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                <li>
                  The email subject will be used as the 'subject' input for the
                  workflow
                </li>
                <li>
                  The email body (text version) will be used as the 'body' input
                  for the workflow
                </li>
                <li>
                  Your workflow must be configured to accept these inputs for
                  the integration to work properly
                </li>
                <li>
                  Only the text version of the email body is processed; HTML
                  content is ignored
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Example usage:</h4>
              <div className="bg-muted p-3 rounded-md text-sm font-mono">
                To: {emailAddress}
                <br />
                Subject: Process my document
                <br />
                Body: Please analyze the attached data and provide insights.
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
