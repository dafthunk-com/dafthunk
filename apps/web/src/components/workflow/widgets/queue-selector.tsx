import Database from "lucide-react/icons/database";
import RefreshCw from "lucide-react/icons/refresh-cw";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQueues } from "@/services/queue-service";
import { cn } from "@/utils/utils";

import type { BaseWidgetProps } from "./widget";
import { createWidget, getInputValue } from "./widget";

interface QueueSelectorWidgetProps extends BaseWidgetProps {
  value: string;
  disabled?: boolean;
}

function QueueSelectorWidget({
  value,
  onChange,
  className,
  readonly = false,
  disabled = false,
}: QueueSelectorWidgetProps) {
  const { queues, queuesError, isQueuesLoading, mutateQueues } = useQueues();

  const isDisabled = readonly || disabled;

  const handleSelect = (queueId: string) => {
    if (!isDisabled) {
      onChange(queueId);
    }
  };

  if (queuesError) {
    return (
      <div className={cn("p-2 text-center", className)}>
        <div className="text-red-500 text-xs mb-2">
          <Database className="h-4 w-4 mx-auto mb-1" />
          {queuesError.message}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={mutateQueues}
          className="text-xs h-6"
          disabled={isQueuesLoading}
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("p-2", className)}>
      <Select
        value={value || ""}
        onValueChange={handleSelect}
        disabled={isDisabled || isQueuesLoading}
      >
        <SelectTrigger className="text-xs h-7">
          <SelectValue
            placeholder={isQueuesLoading ? "Loading..." : "Select queue..."}
          />
        </SelectTrigger>
        <SelectContent>
          {queues?.map((queue) => (
            <SelectItem key={queue.id} value={queue.id} className="text-xs">
              {queue.name}
            </SelectItem>
          ))}
          {queues?.length === 0 && !isQueuesLoading && (
            <SelectItem disabled value="none" className="text-xs">
              No queues found
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

export const queueSelectorWidget = createWidget({
  component: QueueSelectorWidget,
  nodeTypes: ["queue-publish", "queue-message"],
  inputField: "queueId",
  extractConfig: (_nodeId, inputs) => ({
    value: getInputValue(inputs, "queueId", ""),
  }),
});
