import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { getApiBaseUrl } from "@/config/api";

interface EndpointSetupInfoProps {
  mode: "webhook" | "request";
  orgHandle: string;
  endpointId: string;
}

export function EndpointSetupInfo({
  mode,
  orgHandle,
  endpointId,
}: EndpointSetupInfoProps) {
  const baseUrl = getApiBaseUrl().replace(/\/$/, "");
  const executeUrl = `${baseUrl}/${orgHandle}/endpoints/${endpointId}/execute`;

  return (
    <div className="space-y-2 text-sm">
      <div className="space-y-1">
        <p className="font-medium text-foreground">
          Execute Endpoint ({mode === "webhook" ? "Async" : "Sync"})
        </p>
        <CopyableEndpoint endpoint={executeUrl} />
      </div>
      <div className="space-y-1">
        <p className="font-medium text-foreground">Notes</p>
        <ul className="list-disc list-inside space-y-1.5 text-xs text-muted-foreground">
          <li>
            Replace <code className="font-mono">YOUR_API_KEY</code> with an API
            key from your account settings.
          </li>
          {mode === "webhook" ? (
            <li>
              Returns immediately with an execution ID. Poll the status endpoint
              for results.
            </li>
          ) : (
            <>
              <li>
                Executes synchronously and returns the response defined by the
                HTTP Response node.
              </li>
              <li>
                If the workflow takes longer than 10 seconds, it will return a
                504 Gateway Timeout error.
              </li>
            </>
          )}
          <li>Deploy the workflow before calling the endpoint.</li>
        </ul>
      </div>
    </div>
  );
}

function CopyableEndpoint({ endpoint }: { endpoint: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(endpoint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
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
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      </Button>
    </div>
  );
}
