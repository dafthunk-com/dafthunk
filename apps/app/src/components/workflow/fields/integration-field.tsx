import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIntegrations } from "@/integrations";
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
    </div>
  );
}
