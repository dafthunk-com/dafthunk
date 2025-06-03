import { Mail } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EmailIntegrationCardProps {
  orgHandle: string;
  workflowHandle: string;
  deploymentVersion?: string;
  emailDomain?: string;
}

export function EmailIntegrationCard({
  orgHandle,
  workflowHandle,
  deploymentVersion,
  emailDomain = "dafthunk.com",
}: EmailIntegrationCardProps) {
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-xl">
          <Mail className="mr-2 h-4 w-4" />
          Email Integration
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
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
        <p className="text-sm text-muted-foreground mt-4">
          The email subject will be used as the 'subject' input and the email
          body (text version) as the 'body' input for the workflow, if your
          workflow is configured to accept these inputs.
        </p>
      </CardContent>
    </Card>
  );
}
