import { Input } from "@/components/ui/input";
import { cn } from "@/utils/utils";

import { ClearButton } from "./clear-button";
import type { FieldProps } from "./types";

export function GenericField({
  input: _input,
  value,
  onChange,
  onClear,
  disabled,
  clearable,
  className,
  active,
  connected,
}: FieldProps) {
  const hasValue = value !== undefined && value !== "";

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
    <div className={cn("relative", className)}>
      <Input
        value={value !== undefined ? String(value) : ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter value"
        disabled={disabled}
        className={cn(
          "text-xs rounded-md",
          disabled && "bg-muted/50 border-border",
          !disabled && active && "border border-blue-500",
          !disabled &&
            !active &&
            "border border-neutral-300 dark:border-neutral-700"
        )}
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
