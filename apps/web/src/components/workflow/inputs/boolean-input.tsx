import { Switch } from "@/components/ui/switch";
import { cn } from "@/utils/utils";

import type { InputWidgetProps } from "./types";

export function BooleanInputWidget({
  input,
  value,
  onChange,
  readonly,
  className,
}: InputWidgetProps) {
  const boolValue = String(value) === "true";

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <Switch
        id={`boolean-${input.id}`}
        checked={boolValue}
        onCheckedChange={(checked) => onChange(checked ? "true" : "false")}
        disabled={readonly}
      />
    </div>
  );
}
