import { Textarea } from "@/components/ui/textarea";

import type { InputWidgetProps } from "./types";

export function TextInputWidget({
  input,
  value,
  onChange,
  readonly,
}: InputWidgetProps) {
  const placeholder =
    input.type === "json" ? "Enter JSON" : "Enter text";

  return (
    <Textarea
      value={value !== undefined ? String(value) : ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="resize-y text-xs"
      disabled={readonly}
    />
  );
}
