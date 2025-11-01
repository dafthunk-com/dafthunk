import { CodeBlock } from "@/components/docs/code-block";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/utils/utils";

import { ClearButton } from "./clear-button";
import type { FieldProps } from "./types";

export function JsonField({
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

  // Serialize objects/arrays to JSON, or use string value
  const stringValue =
    value !== undefined
      ? typeof value === "object"
        ? JSON.stringify(value, null, 2)
        : String(value)
      : "";

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

  // Disabled state with value - pretty print JSON
  if (disabled) {
    let formattedValue = stringValue;
    let isValidJson = false;

    try {
      const parsed = JSON.parse(stringValue);
      formattedValue = JSON.stringify(parsed, null, 2);
      isValidJson = true;
    } catch {
      // If not valid JSON, show as-is
    }

    return (
      <div
        className={cn(
          "border border-border rounded-md bg-muted/50 overflow-auto",
          className
        )}
      >
        <CodeBlock
          language="json"
          className={cn("text-xs my-0 [&_pre]:p-2", {
            "[&_pre]:text-red-500": !isValidJson,
          })}
        >
          {formattedValue}
        </CodeBlock>
      </div>
    );
  }

  // Editable mode
  return (
    <div className={cn("relative", className)}>
      <Textarea
        value={stringValue}
        onChange={(e) => onChange(e.target.value || undefined)}
        placeholder="Enter JSON"
        className={cn(
          "resize-y text-xs font-mono rounded-md",
          active && "border border-blue-500",
          !active && "border border-neutral-300 dark:border-neutral-700"
        )}
        disabled={disabled}
      />
      {!disabled && clearable && hasValue && (
        <ClearButton
          onClick={onClear}
          label="Clear JSON"
          className="absolute top-2 right-1"
        />
      )}
    </div>
  );
}
