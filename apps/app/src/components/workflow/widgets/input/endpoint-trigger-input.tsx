import type { EndpointMode } from "@dafthunk/types";
import { Globe } from "lucide-react";
import { useMemo, useState } from "react";

import { useAuth } from "@/components/auth-context";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEndpoints } from "@/services/endpoint-service";
import { cn } from "@/utils/utils";
import { updateNodeInput, useWorkflow } from "../../workflow-context";
import type { WorkflowParameter } from "../../workflow-types";
import type { BaseWidgetProps } from "../widget";
import { createWidget, getInputValue } from "../widget";
import { EndpointCreateDialog } from "./endpoint-create-dialog";
import { EndpointTriggerDialog } from "./endpoint-trigger-dialog";

const CREATE_NEW_SENTINEL = "__create_new__";

interface EndpointTriggerInputProps extends BaseWidgetProps {
  nodeId: string;
  endpointId: string;
  inputs: WorkflowParameter[];
  mode: EndpointMode;
}

function EndpointTriggerInputWidget({
  nodeId,
  endpointId,
  inputs,
  mode,
  className,
  disabled = false,
}: EndpointTriggerInputProps) {
  const { endpoints, isEndpointsLoading, mutateEndpoints } = useEndpoints();
  const { updateNodeData, edges, deleteEdge } = useWorkflow();
  const { organization } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEndpointTriggerDialogOpen, setIsEndpointTriggerDialogOpen] =
    useState(false);

  const filteredEndpoints = useMemo(
    () => endpoints.filter((ep) => ep.mode === mode),
    [endpoints, mode]
  );

  const handleEndpointChange = (value: string) => {
    if (value === CREATE_NEW_SENTINEL) {
      setIsCreateDialogOpen(true);
      return;
    }
    updateNodeInput(
      nodeId,
      "endpointId",
      value,
      inputs,
      updateNodeData,
      edges,
      deleteEdge
    );
  };

  const handleEndpointCreated = async (newEndpointId: string) => {
    await mutateEndpoints();
    updateNodeInput(
      nodeId,
      "endpointId",
      newEndpointId,
      inputs,
      updateNodeData,
      edges,
      deleteEdge
    );
    setIsCreateDialogOpen(false);
  };

  return (
    <div className={cn("p-2", className)}>
      <div className="flex items-center gap-1">
        <Select
          value={endpointId || ""}
          onValueChange={handleEndpointChange}
          disabled={disabled || isEndpointsLoading}
        >
          <SelectTrigger className="h-6 text-xs">
            <SelectValue
              placeholder={
                isEndpointsLoading ? "Loading..." : "Select an endpoint"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {filteredEndpoints.map((endpoint) => (
              <SelectItem key={endpoint.id} value={endpoint.id}>
                {endpoint.name}
              </SelectItem>
            ))}
            <SelectSeparator />
            <SelectItem value={CREATE_NEW_SENTINEL}>+ New Endpoint</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          disabled={disabled}
          onClick={() => setIsEndpointTriggerDialogOpen(true)}
          title="Show endpoint integration"
        >
          <Globe className="h-3 w-3" />
        </Button>
      </div>
      <EndpointCreateDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onCreated={handleEndpointCreated}
        defaultMode={mode}
      />
      <EndpointTriggerDialog
        isOpen={isEndpointTriggerDialogOpen}
        onClose={() => setIsEndpointTriggerDialogOpen(false)}
        endpointId={endpointId || null}
        orgHandle={organization?.handle || ""}
      />
    </div>
  );
}

export const httpRequestEndpointWidget = createWidget({
  component: EndpointTriggerInputWidget,
  inputField: "endpointId",
  managedFields: [],
  nodeTypes: ["http-request"],
  extractConfig: (nodeId: string, inputs: WorkflowParameter[]) => ({
    nodeId,
    endpointId: getInputValue(inputs, "endpointId", ""),
    inputs,
    mode: "request" as EndpointMode,
  }),
});

export const httpWebhookEndpointWidget = createWidget({
  component: EndpointTriggerInputWidget,
  inputField: "endpointId",
  managedFields: [],
  nodeTypes: ["http-webhook"],
  extractConfig: (nodeId: string, inputs: WorkflowParameter[]) => ({
    nodeId,
    endpointId: getInputValue(inputs, "endpointId", ""),
    inputs,
    mode: "webhook" as EndpointMode,
  }),
});
