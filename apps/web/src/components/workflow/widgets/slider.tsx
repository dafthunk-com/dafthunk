import { Slider } from "@/components/ui/slider";
import { cn } from "@/utils/utils";

import type { BaseWidgetProps } from "./widget";
import { createWidget, getInputValue } from "./widget";

interface SliderWidgetProps extends BaseWidgetProps {
  value: number;
  min: number;
  max: number;
  step: number;
}

function SliderWidget({
  value,
  min,
  max,
  step,
  onChange,
  className,
  compact = false,
  readonly = false,
}: SliderWidgetProps) {
  const handleValueChange = (values: number[]) => {
    if (values.length > 0 && !readonly) {
      onChange(values[0]);
    }
  };

  return (
    <div className={cn("space-y-2 p-2", className)}>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={handleValueChange}
        className={cn("py-4", compact && "py-2")}
        disabled={readonly}
      />
      <div className="flex justify-between text-xs text-neutral-500">
        <span>{min}</span>
        <span>Value: {value}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

// Widget descriptor - clean, declarative, self-contained
export const sliderWidget = createWidget({
  component: SliderWidget,
  nodeTypes: ["slider"],
  inputField: "value",
  extractConfig: (_nodeId, inputs) => ({
    value: getInputValue(inputs, "value", 0),
    min: getInputValue(inputs, "min", 0),
    max: getInputValue(inputs, "max", 100),
    step: getInputValue(inputs, "step", 1),
  }),
});
