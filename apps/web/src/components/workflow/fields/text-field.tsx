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
  showClearButton,
  className,
  active,
  connected,
}: FieldWidgetProps) {
  const placeholder = input.type === "json" ? "Enter JSON" : "Enter text";
  const hasValue = value !== undefined && value !== "";
  const stringValue = value !== undefined ? String(value) : "";

  // For JSON type when disabled, show syntax-highlighted code block
  if (disabled && input.type === "json" && hasValue) {
    // Try to format JSON nicely
    let formattedValue = stringValue;
    try {
      const parsed = JSON.parse(stringValue);
      formattedValue = JSON.stringify(parsed, null, 2);
    } catch {
      // If not valid JSON, just show as-is
    }

    return (
      <div
        className={cn("border rounded-md bg-muted/50 overflow-auto", className)}
      >
        <CodeBlock language="json" className="text-xs my-0 [&_pre]:p-2">
          {formattedValue}
        </CodeBlock>
      </div>
    );
  }

  // For string type when disabled, show as plain text
  if (disabled) {
    return (
      <div
        className={cn(
          "w-full p-2 bg-muted/50 rounded-md border border-border whitespace-pre-line text-xs",
          className
        )}
      >
        {stringValue || (
          <span className="text-neutral-500 italic">
            {connected ? "Connected" : "No value"}
          </span>
        )}
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
          active && "border border-blue-500"
        )}
        disabled={disabled}
      />
      {!disabled && showClearButton && hasValue && (
        <ClearButton
          onClick={onClear}
          label="Clear text"
          className="absolute top-2 right-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
        />
      )}
    </div>
  );
}
