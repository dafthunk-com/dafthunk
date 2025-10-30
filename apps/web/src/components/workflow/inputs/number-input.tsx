import { Input } from "@/components/ui/input";
import { cn } from "@/utils/utils";

import type { InputWidgetProps } from "./types";

export function NumberInputWidget({
  input,
  value,
  onChange,
  readonly,
  className,
}: InputWidgetProps) {
  return (
    <Input
      type="number"
      value={value !== undefined ? String(value) : ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Enter number"
      disabled={readonly}
      className={cn("text-xs", className)}
    />
  );
}
