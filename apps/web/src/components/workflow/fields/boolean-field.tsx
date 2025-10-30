import { Switch } from "@/components/ui/switch";
import { cn } from "@/utils/utils";

import { ClearButton } from "./clear-button";
import type { FieldWidgetProps } from "./types";

export function BooleanFieldWidget({
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
  const boolValue = String(value) === "true";
  const hasValue = value !== undefined;

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
    <div
      className={cn(
        "relative flex items-center space-x-2 rounded-md p-2",
        disabled
          ? "bg-muted/50 border border-border"
          : "bg-white dark:bg-neutral-950",
        active && !disabled && "border border-blue-500",
        !active && !disabled && "border border-transparent",
        className
      )}
    >
      <Switch
        id={`boolean-${input.id}`}
        checked={boolValue}
        onCheckedChange={(checked) => onChange(checked ? "true" : "false")}
        disabled={disabled}
      />
      {!disabled && showClearButton && hasValue && (
        <ClearButton
          onClick={onClear}
          label="Clear boolean"
          className="absolute top-2 right-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
        />
      )}
    </div>
  );
}
