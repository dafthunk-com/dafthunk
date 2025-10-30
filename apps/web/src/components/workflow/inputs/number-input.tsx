import { Input } from "@/components/ui/input";
import { cn } from "@/utils/utils";

import type { InputWidgetProps } from "./types";

export function NumberInputWidget({
  input,
  value,
  onChange,
  readonly,
  className,
  active,
}: InputWidgetProps) {
  return (
    <Input
      type="text"
      value={value !== undefined ? String(value) : ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Enter number"
      disabled={readonly}
      className={cn(
        "text-xs rounded-md",
        active && "border border-blue-500",
        className
      )}
    />
  );
}
