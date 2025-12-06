import { useMemo } from "react";

import { Button } from "@/components/ui/button";
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

  // Convert value to string for display
  const stringValue = useMemo(() => {
    if (value === undefined) return "";
    if (typeof value === "object") {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  }, [value]);

  // Check if current value is valid JSON
  const isValidJson = useMemo(() => {
    if (!stringValue) return false;
    try {
      JSON.parse(stringValue);
      return true;
    } catch {
      return false;
    }
  }, [stringValue]);

  const handleChange = (newValue: string) => {
    if (!newValue) {
      onChange(undefined);
      return;
    }
    onChange(newValue);
  };

  const formatJson = () => {
    try {
      const parsed = JSON.parse(stringValue);
      onChange(JSON.stringify(parsed, null, 2));
    } catch {
      // Can't format invalid JSON
    }
  };

  // Disabled state without value - show placeholder message
  if (disabled && !hasValue) {
    return (
      <div
        className={cn(
          "h-[200px] text-xs text-neutral-500 italic p-2 bg-muted/50 rounded-md border border-border",
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
      <div className="h-[200px] rounded-md border border-border overflow-hidden">
        <CodeEditor
          value={stringValue}
          onChange={handleChange}
          language="json"
          readonly={readonly}
        />
      </div>
      {!disabled && !readonly && isValidJson && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute top-1 right-1 h-6 px-2 text-xs text-muted-foreground z-10"
          onClick={formatJson}
        >
          Format
        </Button>
      )}
      {!disabled && !readonly && clearable && hasValue && (
        <ClearButton
          onClick={onClear}
          label="Clear JSON"
          className="absolute top-1 right-16 z-10"
        />
      )}
    </div>
  );
}
