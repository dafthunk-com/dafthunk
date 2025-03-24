import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { SliderWidgetProps } from "./types";

export function SliderWidget({
  config,
  onChange,
  className,
  compact = false,
}: SliderWidgetProps) {
  const handleValueChange = (values: number[]) => {
    if (values.length > 0) {
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
      />
      <div className="flex justify-between text-xs text-gray-500">
        <span>{config.min}</span>
        <span>Value: {config.value}</span>
        <span>{config.max}</span>
      </div>
    </div>
  );
} 