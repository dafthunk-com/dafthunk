import { useEffect, useRef, useState } from "react";

import { Slider } from "@/components/ui/slider";
import { cn } from "@/utils/utils";

import type { BaseWidgetProps } from "./widget";
import { createWidget, getInputValue, useDebouncedChange } from "./widget";

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
  readonly = false,
}: SliderWidgetProps) {
  // Use local state for immediate UI updates
  const [localValue, setLocalValue] = useState(value);
  const isUserDraggingRef = useRef(false);

  // Debounce the actual node update
  const { debouncedOnChange } = useDebouncedChange(onChange, 100);

  // Sync local state when prop value changes (e.g., from external updates)
  // but only if user is not currently dragging
  useEffect(() => {
    if (!isUserDraggingRef.current) {
      setLocalValue(value);
    }
  }, [value]);

  const handleValueChange = (values: number[]) => {
    if (values.length > 0 && !readonly) {
      const newValue = values[0];
      isUserDraggingRef.current = true;
      setLocalValue(newValue);
      debouncedOnChange(newValue);

      // Reset dragging flag after debounce completes
      setTimeout(() => {
        isUserDraggingRef.current = false;
      }, 150);
    }
  };

  return (
    <div className={cn("space-y-1 p-2", className)}>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[localValue]}
        onValueChange={handleValueChange}
        className="py-2"
        disabled={readonly}
      />
      <div className="flex justify-between text-neutral-500 text-xs leading-tight">
        <span>{min}</span>
        <span>Value: {localValue}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

// Widget descriptor - clean, declarative, self-contained
export const sliderInputWidget = createWidget({
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
