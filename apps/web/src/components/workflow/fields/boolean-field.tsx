import { Switch } from "@/components/ui/switch";
import { cn } from "@/utils/utils";

import { ClearButton } from "./clear-button";
import type { FieldProps } from "./types";

export function BooleanField({
  className,
  clearable,
  disabled,
  onChange,
  onClear,
  value,
  asWidget: _asWidget, // BooleanField doesn't have container styling to conditionally apply
}: FieldProps) {
  const hasValue = value !== undefined;
  const boolValue = hasValue ? String(value) === "true" : false;

  return (
    <div
      className={cn("flex items-center justify-start gap-2 w-full", className)}
    >
      {!disabled && clearable && hasValue && (
        <ClearButton onClick={onClear} label="Clear boolean" />
      )}
      <Switch
        checked={boolValue}
        onCheckedChange={(checked) => onChange(checked ? "true" : "false")}
        disabled={disabled}
      />
    </div>
  );
}
