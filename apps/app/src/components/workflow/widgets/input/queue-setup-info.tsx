import { getApiBaseUrl } from "@/config/api";

import { CopyableValue } from "./copyable-value";

interface QueueSetupInfoProps {
  queueId: string;
}

export function QueueSetupInfo({ queueId }: QueueSetupInfoProps) {
  const baseUrl = getApiBaseUrl().replace(/\/$/, "");
  const endpoint = `${baseUrl}/queues/${queueId}/publish`;

  return (
    <div className="space-y-2 text-sm">
      <div className="space-y-1">
        <p className="font-medium text-foreground">Publish Endpoint</p>
        <div className="space-y-1.5">
          <CopyableValue value={endpoint} />
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
