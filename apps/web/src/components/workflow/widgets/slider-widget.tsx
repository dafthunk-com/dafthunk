import { Slider } from "@/components/ui/slider";
import { cn } from "@/utils/utils";

import { SliderWidgetProps } from "./types";

export function SliderWidget({
  config,
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
    <div className={cn("space-y-2", className)}>
      <Slider
        min={config.min}
        max={config.max}
        step={config.step}
        value={[config.value]}
        onValueChange={handleValueChange}
        className={cn("py-4", compact && "py-2")}
        disabled={readonly}
      />
      <div className="flex justify-between text-xs text-neutral-500">
        <span>{config.min}</span>
        <span>Value: {config.value}</span>
        <span>{config.max}</span>
      </div>
    </div>
  );
}
