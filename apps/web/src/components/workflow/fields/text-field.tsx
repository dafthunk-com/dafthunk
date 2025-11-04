import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/utils/utils";

import { ClearButton } from "./clear-button";
import type { FieldProps } from "./types";

export function TextField({
  className,
  clearable,
  connected,
  disabled,
  onChange,
  onClear,
  value,
  autoFocus,
}: FieldProps) {
  // Convert to string and check for meaningful value (empty strings are considered "no value")
  const stringValue = String(value ?? "");
  const hasValue = value !== undefined && value !== "";

  // Render editable textarea
  return (
    <div className={cn("relative", className)}>
      <Textarea
        value={stringValue}
        onChange={(e) => onChange(e.target.value || undefined)}
        placeholder={connected ? "Connected" : "Enter text"}
        className={cn(
          "resize-y rounded-md border border-neutral-300 dark:border-neutral-700"
        )}
        disabled={disabled}
        autoFocus={autoFocus}
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
