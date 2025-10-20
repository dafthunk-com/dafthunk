import { Input } from "@/components/ui/input";
import { cn } from "@/utils/utils";

import type { BaseWidgetProps } from "./widget";
import { createWidget, getInputValue } from "./widget";

interface InputTextWidgetProps extends BaseWidgetProps {
  value: string;
  placeholder?: string;
}

function InputTextWidget({
  value,
  placeholder,
  onChange,
  className,
  compact = false,
  readonly = false,
}: InputTextWidgetProps) {
  return (
    <div className={cn("p-2", className)}>
      <Input
        value={value || ""}
        onChange={(e) => !readonly && onChange(e.target.value)}
        placeholder={placeholder || "Enter text..."}
        className={cn(compact && "text-sm h-8")}
        disabled={readonly}
      />
    </div>
  );
}

export const inputTextWidget = createWidget({
  component: InputTextWidget,
  nodeTypes: ["input-text"],
  inputField: "value",
  extractConfig: (_nodeId, inputs) => ({
    value: getInputValue(inputs, "value", ""),
    placeholder: getInputValue(inputs, "placeholder"),
  }),
});
