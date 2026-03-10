import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { getApiBaseUrl } from "@/config/api";

interface QueueSetupInfoProps {
  handle: string;
}

export function QueueSetupInfo({ handle }: QueueSetupInfoProps) {
  const baseUrl = getApiBaseUrl();
  const prodEndpoint = `${baseUrl}/queues/${handle}/publish`;
  const devEndpoint = `${baseUrl}/queues/${handle}/publish/dev`;

  return (
    <div className="space-y-2 text-sm">
      <div className="space-y-1">
        <p className="font-medium text-foreground">Publish Endpoints</p>
        <div className="space-y-1.5">
          <CopyableEndpoint label="Production" endpoint={prodEndpoint} />
          <CopyableEndpoint label="Development" endpoint={devEndpoint} />
        </div>
      </div>
      <div className="space-y-1">
        <p className="font-medium text-foreground">Next Steps</p>
        <ol className="list-decimal list-inside space-y-1.5 text-xs text-muted-foreground">
          <li>
            Create a workflow with a{" "}
            <span className="font-medium text-foreground">
              Receive Queue Message
            </span>{" "}
            trigger and select this queue.
          </li>
          <li>Deploy the workflow.</li>
          <li>
            Send a POST request to the endpoint above to trigger the workflow.
          </li>
        </ol>
      </div>
    </div>
  );
}

function CopyableEndpoint({
  label,
  endpoint,
}: {
  label: string;
  endpoint: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(endpoint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-1">
        <code className="flex-1 text-xs bg-muted px-2 py-1 rounded break-all">
          {endpoint}
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
