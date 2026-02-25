import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/utils/utils";

import { ClearButton } from "./clear-button";
import type { FieldProps } from "./types";

/**
 * Check whether a string is an intermediate numeric input that the user
 * is still actively typing (e.g. "-", "3.", "3.0").
 */
function isIncompleteNumber(s: string): boolean {
  return s === "-" || s === "." || s === "-." || s.endsWith(".");
}

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
  const hasValue = value !== undefined && value !== "";

  // Local string state so intermediate values like "3." aren't destroyed
  const [localValue, setLocalValue] = useState(String(value ?? ""));

  // Sync from parent when the external value changes (e.g. undo, clear)
  useEffect(() => {
    setLocalValue(String(value ?? ""));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // Allow clearing the field
    if (raw === "") {
      setLocalValue("");
      onChange("");
      return;
    }

    // Only accept characters that can form a valid number
    if (!/^-?\d*\.?\d*$/.test(raw)) return;

    setLocalValue(raw);

    // Only propagate when the string is a complete, parseable number
    if (!isIncompleteNumber(raw)) {
      const num = parseFloat(raw);
      if (!isNaN(num)) {
        onChange(num);
      }
    }
  };

  // Commit on blur — normalize trailing dots, etc.
  const handleBlur = () => {
    if (localValue === "" || localValue === "-" || localValue === ".") return;
    const num = parseFloat(localValue);
    if (!isNaN(num)) {
      setLocalValue(String(num));
      onChange(num);
    }
  };

  // Disabled state without value - show placeholder message
  if (disabled && !hasValue) {
    return (
      <div
        className={cn(
          "text-xs text-neutral-500 italic p-2 bg-muted/50 rounded-md border border-border",
          className
        )}
      >
        {connected ? "Connected" : "No number"}
      </div>
    );
  }

  // Has value or enabled - render input
  return (
    <div className={cn("relative", className)}>
      <Input
        type="text"
        inputMode="decimal"
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={connected ? "Connected" : "Enter number"}
        disabled={disabled}
        className={cn(
          "rounded-md",
          disabled && "bg-muted/50 border border-border",
          !disabled && "border border-neutral-300 dark:border-neutral-700"
        )}
        autoFocus={autoFocus}
      />
      {clearable && hasValue && (
        <ClearButton
          onClick={onClear}
          label="Clear number"
          className="absolute top-2 right-1"
          disabled={disabled}
        />
      )}
    </div>
  );
}
