import type { IntegrationProvider } from "@dafthunk/types";
import { useLocation } from "react-router";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getProviderLabel,
  rememberOAuthReturn,
  useIntegrationActions,
  useIntegrations,
} from "@/integrations";
import { cn } from "@/utils/utils";

import type { FieldProps } from "./types";

export function IntegrationField({
  className,
  connected,
  disabled,
  onChange,
  parameter,
  value,
}: FieldProps) {
  const { integrations, isLoading } = useIntegrations();
  const { connectOAuth } = useIntegrationActions();
  const location = useLocation();

  // Narrow the parameter type to access `provider`
  const provider = parameter.type === "integration" ? parameter.provider : "";
  const filtered = integrations?.filter((i) => i.provider === provider);

  const stringValue = String(value ?? "");

  if (disabled) {
    const label = filtered?.find((i) => i.id === stringValue)?.name ?? "";
    return (
      <div className={cn("relative", className)}>
        <Select value={stringValue} disabled>
          <SelectTrigger>
            <SelectValue
              placeholder={connected ? "Connected" : label || "No integration"}
            >
              {connected ? "Connected" : label || "No integration"}
            </SelectValue>
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
        disabled={isLoading}
      >
        <SelectTrigger>
          <SelectValue
            placeholder={
              connected
                ? "Connected"
                : isLoading
                  ? "Loading..."
                  : filtered?.length === 0
                    ? "No integrations"
                    : "Select integration"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {filtered?.map((integration) => (
            <SelectItem
              key={integration.id}
              value={integration.id}
              className="text-xs"
            >
              {integration.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {/* The way out of an empty picker. Without this, "No integrations" is
          a dead end three screens from the page that could fix it. */}
      {!isLoading && provider && filtered?.length === 0 && (
        <button
          type="button"
          className="mt-1 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          onClick={() => {
            rememberOAuthReturn(`${location.pathname}${location.search}`);
            connectOAuth(provider as IntegrationProvider);
          }}
        >
          Connect {getProviderLabel(provider as IntegrationProvider)}
        </button>
      )}
    </div>
  );
}
