import { useMemo } from "react";

import { CodeEditor } from "@/components/ui/code-editor";
import { cn } from "@/utils/utils";

import { ClearButton } from "./clear-button";
import type { FieldProps } from "./types";

export function JsonField({
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

  const readonly = disabled ?? false;

  // Format value for display (pretty-print if valid JSON)
  const formattedValue = useMemo(() => {
    if (value === undefined) return "";
    const stringValue =
      typeof value === "object"
        ? JSON.stringify(value, null, 2)
        : String(value);
    try {
      const parsed = JSON.parse(stringValue);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return stringValue;
    }
  }, [value]);

  const handleChange = (newValue: string) => {
    if (!newValue) {
      onChange(undefined);
      return;
    }
    // Try to parse and re-format, otherwise keep as string
    try {
      const parsed = JSON.parse(newValue);
      onChange(JSON.stringify(parsed, null, 2));
    } catch {
      onChange(newValue);
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
        {connected ? "Connected" : "No value"}
      </div>
    );
  }

  return (
    <div
      className={cn("relative", className)}
      onWheelCapture={(e) => {
        e.stopPropagation();
      }}
    >
      <div className="min-h-[80px] max-h-[200px] rounded-md border border-border overflow-hidden">
        <CodeEditor
          value={formattedValue}
          onChange={handleChange}
          language="json"
          readonly={readonly}
        />
      </div>
      {!disabled && !readonly && clearable && hasValue && (
        <ClearButton
          onClick={onClear}
          label="Clear JSON"
          className="absolute top-2 right-2 z-10"
        />
      )}
    </div>
  );
}
