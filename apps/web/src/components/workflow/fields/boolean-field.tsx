import { Switch } from "@/components/ui/switch";
import { cn } from "@/utils/utils";

import { ClearButton } from "./clear-button";
import type { FieldProps } from "./types";

export function BooleanField({
  input,
  value,
  onChange,
  onClear,
  disabled,
  clearable,
  className,
  active,
  connected,
}: FieldProps) {
  const boolValue = String(value) === "true";
  const hasValue = value !== undefined;

  // Disabled state without value
  if (disabled && !hasValue) {
    return (
      <div
        className={cn(
          "text-xs text-neutral-500 italic p-2 bg-muted/50 rounded-md border border-border",
          className
        )}
      >
        {connected ? "Connected" : "No value"}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex items-center space-x-2 rounded-md p-2",
        disabled && "bg-muted/50 border border-border",
        !disabled && "bg-white dark:bg-neutral-950",
        !disabled && active && "border border-blue-500",
        !disabled &&
          !active &&
          "border border-neutral-300 dark:border-neutral-700",
        className
      )}
    >
      <Switch
        id={`boolean-${input.id}`}
        checked={boolValue}
        onCheckedChange={(checked) => onChange(checked ? "true" : "false")}
        disabled={disabled}
      />
      {!disabled && clearable && hasValue && (
        <ClearButton
          onClick={onClear}
          label="Clear boolean"
          className="absolute top-2 right-1"
        />
      )}
    </div>
  );
}
