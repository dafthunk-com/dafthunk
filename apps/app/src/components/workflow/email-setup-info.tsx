import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

interface EmailSetupInfoProps {
  handle: string;
  orgHandle: string;
}

export function EmailSetupInfo({ handle, orgHandle }: EmailSetupInfoProps) {
  const prodAddress = `${orgHandle}+${handle}@dafthunk.com`;
  const devAddress = `${orgHandle}+${handle}+dev@dafthunk.com`;

  return (
    <div className="space-y-2 text-sm">
      <div className="space-y-1">
        <p className="font-medium text-foreground">Email Addresses</p>
        <div className="space-y-1.5">
          <CopyableAddress label="Production" address={prodAddress} />
          <CopyableAddress label="Development" address={devAddress} />
        </div>
      </div>
      <div className="space-y-1">
        <p className="font-medium text-foreground">Next Steps</p>
        <ol className="list-decimal list-inside space-y-1.5 text-xs text-muted-foreground">
          <li>
            Create a workflow with a{" "}
            <span className="font-medium text-foreground">Receive Email</span>{" "}
            trigger and select this inbox.
          </li>
          <li>Deploy the workflow.</li>
          <li>Send an email to the address above to trigger the workflow.</li>
        </ol>
      </div>
    </div>
  );
}

function CopyableAddress({
  label,
  address,
}: {
  label: string;
  address: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-1">
        <code className="flex-1 text-xs bg-muted px-2 py-1 rounded break-all">
          {address}
        </code>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-3 w-3" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </div>
    </div>
  );
}
