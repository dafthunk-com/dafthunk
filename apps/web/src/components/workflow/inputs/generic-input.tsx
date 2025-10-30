import { Input } from "@/components/ui/input";
import { cn } from "@/utils/utils";

import type { InputWidgetProps } from "./types";

export function GenericInputWidget({
  input,
  value,
  onChange,
  readonly,
  className,
}: InputWidgetProps) {
  return (
    <Input
      value={value !== undefined ? String(value) : ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Enter value"
      disabled={readonly}
      className={cn("text-xs", className)}
    />
  );
}
