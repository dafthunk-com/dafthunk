import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/utils/utils";

import type { BaseWidgetProps } from "./widget";
import { createWidget, getInputValue } from "./widget";

interface TextAreaWidgetProps extends BaseWidgetProps {
  value: string;
  placeholder?: string;
  rows: number;
}

function TextAreaWidget({
  value,
  placeholder,
  rows,
  onChange,
  className,
  compact = false,
  readonly = false,
}: TextAreaWidgetProps) {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!readonly) {
      onChange(e.target.value);
    }
  };

  return (
    <div className={cn("p-2", className)}>
      <Textarea
        value={value || ""}
        onChange={handleChange}
        placeholder={placeholder || "Enter text..."}
        className={cn(compact && "min-h-[100px]")}
        disabled={readonly}
        rows={compact ? undefined : rows}
      />
    </div>
  );
}

export const textAreaWidget = createWidget({
  component: TextAreaWidget,
  nodeTypes: ["text-area"],
  inputField: "value",
  extractConfig: (_nodeId, inputs) => ({
    value: getInputValue(inputs, "value", ""),
    placeholder: getInputValue(inputs, "placeholder"),
    rows: getInputValue(inputs, "rows", 4),
  }),
});
