import { Switch } from "@/components/ui/switch";
import { cn } from "@/utils/utils";

import type { InputWidgetProps } from "./types";

export function BooleanInputWidget({
  input,
  value,
  onChange,
  readonly,
  className,
  active,
}: InputWidgetProps) {
  const boolValue = String(value) === "true";

  return (
    <div
      className={cn(
        "flex items-center space-x-2 rounded-md p-2 bg-white dark:bg-neutral-950",
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
    </div>
  );
}
