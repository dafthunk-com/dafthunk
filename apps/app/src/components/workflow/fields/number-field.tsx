import { Input } from "@/components/ui/input";
import { cn } from "@/utils/utils";

import { ClearButton } from "./clear-button";
import type { FieldProps } from "./types";

export function NumberField({
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

  // Render editable input
  return (
    <div className={cn("relative", className)}>
      <Input
        type="text"
        value={stringValue}
        onChange={(e) => onChange(e.target.value)}
        placeholder={connected ? "Connected" : "Enter number"}
        disabled={disabled}
        className="rounded-md border border-neutral-300 dark:border-neutral-700"
        autoFocus={autoFocus}
      />
      {!disabled && clearable && hasValue && (
        <ClearButton
          onClick={onClear}
          label="Clear number"
          className="absolute top-2 right-1"
        />
      )}
    </div>
  );
}
