import { Input } from "@/components/ui/input";
import { cn } from "@/utils/utils";

import { ClearButton } from "./clear-button";
import type { FieldWidgetProps } from "./types";

export function GenericFieldWidget({
  input: _input,
  value,
  onChange,
  onClear,
  disabled,
  showClearButton,
  className,
  active,
  connected,
}: FieldWidgetProps) {
  const hasValue = value !== undefined && value !== "";

  // When connected but no value yet, show "Connected" message
  if (disabled && connected && !hasValue) {
    return (
      <div
        className={cn(
          "text-xs text-neutral-500 italic p-2 bg-muted/50 rounded-md border border-border",
          className
        )}
      >
        Connected
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
          disabled && "bg-muted/50",
          active && "border border-blue-500"
        )}
      />
      {!disabled && showClearButton && hasValue && (
        <ClearButton
          onClick={onClear}
          label="Clear value"
          className="absolute top-2 right-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
        />
      )}
    </div>
  );
}
