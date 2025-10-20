import { Input } from "@/components/ui/input";
import { cn } from "@/utils/utils";

import type { BaseWidgetProps } from "./widget";
import { createWidget, getInputValue } from "./widget";

interface NumberInputWidgetProps extends BaseWidgetProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}

function NumberInputWidget({
  value,
  min,
  max,
  step,
  placeholder,
  onChange,
  className,
  compact = false,
  readonly = false,
}: NumberInputWidgetProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readonly) return;

    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      onChange(val);
    }
  };

  return (
    <div className={cn("p-2", className)}>
      <Input
        type="number"
        value={value || ""}
        onChange={handleChange}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder || "Enter number..."}
        className={cn(compact && "h-8 text-sm")}
        disabled={readonly}
      />
    </div>
  );
}

export const numberInputWidget = createWidget({
  component: NumberInputWidget,
  nodeTypes: ["number-input"],
  inputField: "value",
  extractConfig: (_nodeId, inputs) => ({
    value: getInputValue(inputs, "value", 0),
    min: getInputValue(inputs, "min"),
    max: getInputValue(inputs, "max"),
    step: getInputValue(inputs, "step"),
    placeholder: getInputValue(inputs, "placeholder"),
  }),
});
