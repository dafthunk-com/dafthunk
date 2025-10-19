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
import { useIntegrations } from "@/integrations";
import { cn } from "@/utils/utils";

import type { WorkflowParameter } from "../workflow-types";

export interface IntegrationSelectorWidgetProps {
  type: "integration-selector";
  id: string;
  name: string;
  value: string;
  provider?: string;
  onChange: (value: string) => void;
  className?: string;
  compact?: boolean;
  readonly?: boolean;
}

export type IntegrationSelectorConfig = Omit<
  IntegrationSelectorWidgetProps,
  "onChange" | "className" | "compact" | "readonly"
>;

// Factory function to create metadata for integration widgets with different providers
export const createIntegrationSelectorMeta = (nodeTypes: string[], provider: string) => ({
  nodeTypes,
  inputField: "integrationId",
  createConfig: (nodeId: string, inputs: WorkflowParameter[]): IntegrationSelectorConfig => {
    const value = inputs.find((i) => i.id === "integrationId")?.value as string;

    return {
      type: "integration-selector",
      id: nodeId,
      name: "Integration Selector",
      value: value || "",
      provider,
    };
  },
});

export function IntegrationSelectorWidget({
  value,
  provider,
  onChange,
  className,
  compact = false,
  readonly = false,
}: IntegrationSelectorWidgetProps) {
  const { integrations, error, isLoading, mutate } = useIntegrations();

  const handleSelect = (integrationId: string) => {
    if (readonly) return;
    onChange(integrationId);
  };

  // Filter integrations by provider if specified
  const filteredIntegrations = provider
    ? integrations?.filter((i) => i.provider === provider)
    : integrations;

  if (error) {
    return (
      <div className={cn("p-2 text-center", className)}>
        <div className="text-red-500 text-xs mb-2">
          <Database className="h-4 w-4 mx-auto mb-1" />
          {error.message}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={mutate}
          className="text-xs h-6"
          disabled={isLoading}
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
        disabled={readonly || isLoading}
      >
        <SelectTrigger className={cn("text-xs", compact ? "h-7" : "h-8")}>
          <SelectValue
            placeholder={isLoading ? "Loading..." : "Select integration..."}
          />
        </SelectTrigger>
        <SelectContent>
          {filteredIntegrations?.map((integration) => (
            <SelectItem
              key={integration.id}
              value={integration.id}
              className="text-xs"
            >
              {integration.name}
            </SelectItem>
          ))}
          {filteredIntegrations?.length === 0 && !isLoading && (
            <SelectItem disabled value="none" className="text-xs">
              No integrations found
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
