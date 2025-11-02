import { Input } from "@/components/ui/input";
import { cn } from "@/utils/utils";

import { ClearButton } from "./clear-button";
import type { FieldProps } from "./types";

export function NumberField({
  value,
  onChange,
  onClear,
  disabled,
  clearable,
  className,
  active,
  connected,
}: FieldProps) {
  const stringValue = String(value ?? "");
  const hasValue = value !== undefined && value !== "";

  return (
    <div className={cn("relative", className)}>
      <Input
        type="text"
        value={stringValue}
        onChange={(e) => onChange(e.target.value)}
        placeholder={connected ? "Connected" : "Enter number"}
        disabled={disabled}
        className={cn(
          "text-xs rounded-md",
          active
            ? "border-blue-500"
            : "border-neutral-300 dark:border-neutral-700"
        )}
      />
      {!disabled && clearable && hasValue && (
        <ClearButton
          onClick={onClear}
          label="Clear number"
          className="absolute top-2 right-1"
        />
      )}
    </div>
  );
}
