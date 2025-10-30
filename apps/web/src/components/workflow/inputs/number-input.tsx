import { Input } from "@/components/ui/input";
import { cn } from "@/utils/utils";

import { ClearButton } from "./clear-button";
import type { InputWidgetProps } from "./types";

export function NumberInputWidget({
  input,
  value,
  onChange,
  onClear,
  disabled,
  showClearButton,
  className,
  active,
}: InputWidgetProps) {
  const hasValue = value !== undefined && value !== "";

  return (
    <div className={cn("relative", className)}>
      <Input
        type="text"
        value={value !== undefined ? String(value) : ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter number"
        disabled={disabled}
        className={cn(
          "text-xs rounded-md",
          active && "border border-blue-500"
        )}
      />
      {!disabled && showClearButton && hasValue && (
        <ClearButton
          onClick={onClear}
          label="Clear number"
          className="absolute top-2 right-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
        />
      )}
    </div>
  );
}
