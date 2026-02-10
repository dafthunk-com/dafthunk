import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQueues } from "@/services/queue-service";
import { cn } from "@/utils/utils";

import type { FieldProps } from "./types";

export function QueueField({
  className,
  connected,
  disabled,
  onChange,
  value,
}: FieldProps) {
  const { queues, isQueuesLoading } = useQueues();

  const stringValue = String(value ?? "");

  if (disabled) {
    const label = queues?.find((q) => q.id === stringValue)?.name ?? "";
    return (
      <div className={cn("relative", className)}>
        <Select value={stringValue} disabled>
          <SelectTrigger>
            <SelectValue
              placeholder={connected ? "Connected" : label || "No queue"}
            />
          </SelectTrigger>
        </Select>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <Select
        value={stringValue}
        onValueChange={(val) => onChange(val || undefined)}
        disabled={isQueuesLoading}
      >
        <SelectTrigger>
          <SelectValue
            placeholder={
              connected
                ? "Connected"
                : isQueuesLoading
                  ? "Loading..."
                  : queues?.length === 0
                    ? "No queues"
                    : "Select queue"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {queues?.map((queue) => (
            <SelectItem key={queue.id} value={queue.id} className="text-xs">
              {queue.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
