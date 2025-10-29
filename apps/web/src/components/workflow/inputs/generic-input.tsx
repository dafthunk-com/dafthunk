import { Input } from "@/components/ui/input";

import type { InputWidgetProps } from "./types";

export function GenericInputWidget({
  value,
  onChange,
  readonly,
}: InputWidgetProps) {
  return (
    <Input
      value={value !== undefined ? String(value) : ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Enter value"
      disabled={readonly}
      className="text-xs"
    />
  );
}
