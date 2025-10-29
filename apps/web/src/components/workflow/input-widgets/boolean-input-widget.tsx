import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import type { InputWidgetProps } from "./types";

export function BooleanInputWidget({
  input,
  value,
  onChange,
  readonly,
}: InputWidgetProps) {
  const boolValue = String(value) === "true";

  return (
    <div className="flex items-center space-x-2">
      <Switch
        id={`boolean-${input.id}`}
        checked={boolValue}
        onCheckedChange={(checked) => onChange(checked ? "true" : "false")}
        disabled={readonly}
      />
      <Label htmlFor={`boolean-${input.id}`} className="text-xs">
        {boolValue ? "True" : "False"}
      </Label>
    </div>
  );
}
