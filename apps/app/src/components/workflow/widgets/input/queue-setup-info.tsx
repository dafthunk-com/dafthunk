import { getApiBaseUrl } from "@/config/api";

import { CopyableValue } from "./copyable-value";

interface QueueSetupInfoProps {
  handle: string;
}

export function QueueSetupInfo({ handle }: QueueSetupInfoProps) {
  const baseUrl = getApiBaseUrl().replace(/\/$/, "");
  const prodEndpoint = `${baseUrl}/queues/${handle}/publish`;
  const devEndpoint = `${baseUrl}/queues/${handle}/publish/dev`;

  return (
    <div className="space-y-2 text-sm">
      <div className="space-y-1">
        <p className="font-medium text-foreground">Publish Endpoints</p>
        <div className="space-y-1.5">
          <CopyableValue label="Production" value={prodEndpoint} />
          <CopyableValue label="Development" value={devEndpoint} />
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
          <li>Enable the workflow.</li>
          <li>
            Send a POST request to the endpoint above to trigger the workflow.
          </li>
        </ol>
      </div>
    </div>
  );
}
