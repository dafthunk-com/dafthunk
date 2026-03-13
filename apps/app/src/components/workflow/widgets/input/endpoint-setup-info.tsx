import { getApiBaseUrl } from "@/config/api";

import { CopyableValue } from "./copyable-value";

interface EndpointSetupInfoProps {
  mode: "webhook" | "request";
  endpointId: string;
}

export function EndpointSetupInfo({
  mode,
  endpointId,
}: EndpointSetupInfoProps) {
  const baseUrl = getApiBaseUrl().replace(/\/$/, "");
  const executeUrl = `${baseUrl}/endpoints/${endpointId}/execute`;

  return (
    <div className="space-y-2 text-sm">
      <div className="space-y-1">
        <p className="font-medium text-foreground">
          Execute Endpoint ({mode === "webhook" ? "Async" : "Sync"})
        </p>
        <CopyableValue value={executeUrl} />
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
          <li>Enable the workflow before calling the endpoint.</li>
        </ul>
      </div>
    </div>
  );
}
