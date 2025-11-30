import { Input } from "@/components/ui/input";
import { cn } from "@/utils/utils";

import { ClearButton } from "./clear-button";
import type { FieldProps } from "./types";

export function GenericField({
  className,
  clearable,
  connected,
  disabled,
  onChange,
  onClear,
  value,
}: FieldProps) {
  // Check for meaningful value (empty strings are considered "no value")
  const hasValue = value !== undefined && value !== "";

  // Disabled state without value - show placeholder message
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

  // Disabled state with value - show read-only display
  if (disabled) {
    return (
      <div
        className={cn(
          "text-xs p-2 bg-muted/50 rounded-md border border-border",
          className
        )}
      >
        {String(value)}
      </div>
    );
  }

  // Enabled state - render editable input
  return (
    <div className={cn("relative", className)}>
      <Input
        value={value !== undefined ? String(value) : ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter value"
        disabled={disabled}
        className="rounded-md border border-neutral-300 dark:border-neutral-700"
      />
      {!disabled && clearable && hasValue && (
        <ClearButton
          onClick={onClear}
          label="Clear value"
          className="absolute top-2 right-1"
        />
      )}
    </div>
  );
}
