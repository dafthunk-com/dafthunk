import { Switch } from "@/components/ui/switch";
import { cn } from "@/utils/utils";

import { ClearButton } from "./clear-button";
import type { InputWidgetProps } from "./types";

export function BooleanInputWidget({
  input,
  value,
  onChange,
  onClear,
  readonly,
  showClearButton,
  className,
  active,
}: InputWidgetProps) {
  const boolValue = String(value) === "true";
  const hasValue = value !== undefined;

  return (
    <div
      className={cn(
        "relative flex items-center space-x-2 rounded-md p-2 bg-white dark:bg-neutral-950",
        active
          ? "border border-blue-500"
          : "border border-transparent",
        className
      )}
    >
      <Switch
        id={`boolean-${input.id}`}
        checked={boolValue}
        onCheckedChange={(checked) => onChange(checked ? "true" : "false")}
        disabled={readonly}
      />
      {!readonly && showClearButton && hasValue && (
        <ClearButton
          onClick={onClear}
          label="Clear boolean"
          className="absolute top-2 right-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
        />
      )}
    </div>
  );
}
