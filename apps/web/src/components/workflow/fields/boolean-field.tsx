import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/utils/utils";
import { Check, Minus, X } from "lucide-react";

import { ClearButton } from "./clear-button";
import type { FieldProps } from "./types";

export function BooleanField({
  className,
  clearable,
  connected,
  disabled,
  onChange,
  onClear,
  value,
}: FieldProps) {
  // Check for defined value (boolean fields consider undefined as "no value")
  const hasValue = value !== undefined;
  const boolValue = hasValue ? String(value) === "true" : null;

  // Helper to get the appropriate icon based on current value
  const getIcon = () => {
    if (boolValue === null)
      return <Minus className="h-4 w-4 text-muted-foreground" />;
    return boolValue ? (
      <Check className="h-4 w-4" />
    ) : (
      <X className="h-4 w-4" />
    );
  };

  // Helper to get the appropriate label based on current value
  const getLabel = () => {
    if (boolValue === null) return connected ? "Connected" : "None";
    return boolValue ? "True" : "False";
  };

  // Render toggle button with icon and label
  return (
    <Toggle
      pressed={boolValue === true}
      onPressedChange={(pressed) => onChange(pressed ? "true" : "false")}
      disabled={disabled}
      className={cn(
        "text-xs rounded-md gap-2 justify-between w-full bg-background border border-neutral-300 dark:border-neutral-700",
        className
      )}
    >
      <div className="flex items-center gap-2">
        {getIcon()}
        <span>{getLabel()}</span>
      </div>
      {!disabled && clearable && hasValue && (
        <ClearButton onClick={onClear} label="Clear boolean" />
      )}
    </Toggle>
  );
}
