import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/utils/utils";

import { ClearButton } from "./clear-button";
import type { InputWidgetProps } from "./types";

export function TextInputWidget({
  input,
  value,
  onChange,
  onClear,
  disabled,
  showClearButton,
  className,
  active,
}: InputWidgetProps) {
  const placeholder = input.type === "json" ? "Enter JSON" : "Enter text";
  const hasValue = value !== undefined && value !== "";

  return (
    <div className={cn("relative", className)}>
      <Textarea
        value={value !== undefined ? String(value) : ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        placeholder={placeholder}
        className={cn(
          "resize-y text-xs rounded-md",
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
