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
import { useIntegrations } from "@/services/integrations-service";
import { cn } from "@/utils/utils";

import { IntegrationSelectorWidgetProps } from "./types";

export function IntegrationSelectorWidget({
  config,
  onChange,
  className,
  compact = false,
  readonly = false,
}: IntegrationSelectorWidgetProps) {
  const { integrations, integrationsError, isIntegrationsLoading, mutateIntegrations } =
    useIntegrations();

  const handleSelect = (integrationId: string) => {
    if (readonly) return;
    onChange(integrationId);
  };

  // Filter integrations by provider if specified
  const filteredIntegrations = config.provider
    ? integrations?.filter((i) => i.provider === config.provider)
    : integrations;

  if (integrationsError) {
    return (
      <div className={cn("p-2 text-center", className)}>
        <div className="text-red-500 text-xs mb-2">
          <Database className="h-4 w-4 mx-auto mb-1" />
          {integrationsError.message}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={mutateIntegrations}
          className="text-xs h-6"
          disabled={isIntegrationsLoading}
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
        value={config.value || ""}
        onValueChange={handleSelect}
        disabled={readonly || isIntegrationsLoading}
      >
        <SelectTrigger className={cn("text-xs", compact ? "h-7" : "h-8")}>
          <SelectValue
            placeholder={
              isIntegrationsLoading ? "Loading..." : "Select integration..."
            }
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
          {filteredIntegrations?.length === 0 && !isIntegrationsLoading && (
            <SelectItem disabled value="" className="text-xs">
              No integrations found
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
