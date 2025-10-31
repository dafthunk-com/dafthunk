import { CodeBlock } from "@/components/docs/code-block";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/utils/utils";

import { ClearButton } from "./clear-button";
import type { FieldWidgetProps } from "./types";

export function TextFieldWidget({
  input,
  value,
  onChange,
  onClear,
  disabled,
  clearable,
  className,
  active,
  connected,
}: FieldWidgetProps) {
  const placeholder = input.type === "json" ? "Enter JSON" : "Enter text";
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

  // Disabled state with value - JSON type shows code block
  if (disabled && input.type === "json") {
    let formattedValue = stringValue;
    try {
      const parsed = JSON.parse(stringValue);
      formattedValue = JSON.stringify(parsed, null, 2);
    } catch {
      // If not valid JSON, just show as-is
    }

    return (
      <div
        className={cn(
          "border border-border rounded-md bg-muted/50 overflow-auto",
          className
        )}
      >
        <CodeBlock language="json" className="text-xs my-0 [&_pre]:p-2">
          {formattedValue}
        </CodeBlock>
      </div>
    );
  }

  // Disabled state with value - string type shows plain text
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
        placeholder={placeholder}
        className={cn(
          "resize-y text-xs rounded-md",
          input.type === "json" && "font-mono",
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
