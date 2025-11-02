import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/utils/utils";
import { Check, Minus, X } from "lucide-react";

import { ClearButton } from "./clear-button";
import type { FieldProps } from "./types";

export function BooleanField({
  value,
  onChange,
  onClear,
  disabled,
  clearable,
  className,
  active,
  connected,
}: FieldProps) {
  const hasValue = value !== undefined;
  const boolValue = hasValue ? String(value) === "true" : null;

  const getIcon = () => {
    if (boolValue === null)
      return <Minus className="h-4 w-4 text-muted-foreground" />;
    return boolValue ? (
      <Check className="h-4 w-4" />
    ) : (
      <X className="h-4 w-4" />
    );
  };

  const getLabel = () => {
    if (boolValue === null) return connected ? "Connected" : "None";
    return boolValue ? "True" : "False";
  };

  return (
    <Toggle
      pressed={boolValue === true}
      onPressedChange={(pressed) => onChange(pressed ? "true" : "false")}
      disabled={disabled}
      className={cn(
        "text-xs rounded-md gap-2 justify-between w-full bg-background border",
        active
          ? "border-blue-500"
          : "border-neutral-300 dark:border-neutral-700",
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
