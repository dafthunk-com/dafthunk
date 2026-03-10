import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQueues } from "@/services/queue-service";
import { cn } from "@/utils/utils";
import { updateNodeInput, useWorkflow } from "../../workflow-context";
import type { WorkflowParameter } from "../../workflow-types";
import type { BaseWidgetProps } from "../widget";
import { createWidget, getInputValue } from "../widget";
import { QueueCreateDialog } from "./queue-create-dialog";

const CREATE_NEW_SENTINEL = "__create_new__";

interface QueueTriggerInputProps extends BaseWidgetProps {
  nodeId: string;
  queueId: string;
  inputs: WorkflowParameter[];
}

function QueueTriggerInputWidget({
  nodeId,
  queueId,
  inputs,
  className,
  disabled = false,
}: QueueTriggerInputProps) {
  const { queues, isQueuesLoading, mutateQueues } = useQueues();
  const { updateNodeData, edges, deleteEdge } = useWorkflow();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const handleQueueChange = (value: string) => {
    if (value === CREATE_NEW_SENTINEL) {
      setIsCreateDialogOpen(true);
      return;
    }
    updateNodeInput(
      nodeId,
      "queueId",
      value,
      inputs,
      updateNodeData,
      edges,
      deleteEdge
    );
  };

  const handleQueueCreated = async (newQueueId: string) => {
    await mutateQueues();
    updateNodeInput(
      nodeId,
      "queueId",
      newQueueId,
      inputs,
      updateNodeData,
      edges,
      deleteEdge
    );
    setIsCreateDialogOpen(false);
  };

  return (
    <div className={cn("p-2", className)}>
      <Select
        value={queueId || ""}
        onValueChange={handleQueueChange}
        disabled={disabled || isQueuesLoading}
      >
        <SelectTrigger className="h-6 text-xs">
          <SelectValue
            placeholder={isQueuesLoading ? "Loading..." : "Select a queue"}
          />
        </SelectTrigger>
        <SelectContent>
          {queues.map((queue) => (
            <SelectItem key={queue.id} value={queue.id}>
              {queue.name}
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={CREATE_NEW_SENTINEL}>+ New Queue</SelectItem>
        </SelectContent>
      </Select>
      <QueueCreateDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onCreated={handleQueueCreated}
      />
    </div>
  );
}

export const queueTriggerInputWidget = createWidget({
  component: QueueTriggerInputWidget,
  nodeTypes: ["queue-message", "queue-send", "queue-send-batch"],
  inputField: "queueId",
  managedFields: [],
  extractConfig: (nodeId, inputs) => ({
    nodeId,
    queueId: getInputValue(inputs, "queueId", ""),
    inputs,
  }),
});
