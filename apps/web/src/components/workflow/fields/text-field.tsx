import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/utils/utils";

import { ClearButton } from "./clear-button";
import type { FieldProps } from "./types";

export function TextField({
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
  const stringValue = value !== undefined ? String(value) : "";

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

  // Disabled state with value - shows plain text
  if (disabled) {
    return (
      <div
        className={cn(
          "w-full p-2 bg-muted/50 rounded-md border border-border whitespace-pre-line text-xs",
          className
        )}
      >
        {stringValue}
      </div>
    );
  }

  // Editable mode
  return (
    <div className={cn("relative", className)}>
      <Textarea
        value={stringValue}
        onChange={(e) => onChange(e.target.value || undefined)}
        placeholder="Enter text"
        className={cn(
          "resize-y text-xs rounded-md",
          active && "border border-blue-500",
          !active && "border border-neutral-300 dark:border-neutral-700"
        )}
        disabled={disabled}
      />
      {!disabled && clearable && hasValue && (
        <ClearButton
          onClick={onClear}
          label="Clear text"
          className="absolute top-2 right-1"
        />
      )}
    </div>
  );
}
