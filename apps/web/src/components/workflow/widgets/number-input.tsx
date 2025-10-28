import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/utils/utils";

import type { BaseWidgetProps } from "./widget";
import { createWidget, getInputValue, useDebouncedChange } from "./widget";

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
  readonly = false,
}: NumberInputWidgetProps) {
  // Use local state for immediate UI updates
  const [localValue, setLocalValue] = useState(value?.toString() || "");
  const isUserTypingRef = useRef(false);

  // Debounce the actual node update
  const { debouncedOnChange } = useDebouncedChange(onChange, 300);

  // Sync local state when prop value changes (e.g., from external updates)
  // but only if user is not currently typing
  useEffect(() => {
    if (!isUserTypingRef.current) {
      setLocalValue(value?.toString() || "");
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readonly) return;

    const newValue = e.target.value;
    isUserTypingRef.current = true;
    setLocalValue(newValue);

    const val = parseFloat(newValue);
    if (!isNaN(val)) {
      debouncedOnChange(val);
    }

    // Reset typing flag after debounce completes
    setTimeout(() => {
      isUserTypingRef.current = false;
    }, 350);
  };

  return (
    <div className={cn("p-1", className)}>
      <Input
        type="number"
        value={localValue}
        onChange={handleChange}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder || "Enter number..."}
        className="h-6 text-xs leading-tight px-1.5 py-0.5"
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
