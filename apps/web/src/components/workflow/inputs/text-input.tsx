import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/utils/utils";

import type { InputWidgetProps } from "./types";

export function TextInputWidget({
  input,
  value,
  onChange,
  readonly,
  className,
}: InputWidgetProps) {
  const placeholder =
    input.type === "json" ? "Enter JSON" : "Enter text";

  return (
    <Textarea
      value={value !== undefined ? String(value) : ""}
      onChange={(e) => onChange(e.target.value || undefined)}
      placeholder={placeholder}
      className={cn("resize-y text-xs", className)}
      disabled={readonly}
    />
  );
}
