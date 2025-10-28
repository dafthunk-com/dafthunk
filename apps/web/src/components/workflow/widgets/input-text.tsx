import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/utils/utils";

import type { BaseWidgetProps } from "./widget";
import { createWidget, getInputValue, useDebouncedChange } from "./widget";

interface InputTextWidgetProps extends BaseWidgetProps {
  value: string;
  placeholder?: string;
}

function InputTextWidget({
  value,
  placeholder,
  onChange,
  className,
  readonly = false,
}: InputTextWidgetProps) {
  // Use local state for immediate UI updates
  const [localValue, setLocalValue] = useState(value || "");
  const isUserTypingRef = useRef(false);

  // Debounce the actual node update
  const { debouncedOnChange } = useDebouncedChange(onChange, 300);

  // Sync local state when prop value changes (e.g., from external updates)
  // but only if user is not currently typing
  useEffect(() => {
    if (!isUserTypingRef.current) {
      setLocalValue(value || "");
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!readonly) {
      const newValue = e.target.value;
      isUserTypingRef.current = true;
      setLocalValue(newValue);
      debouncedOnChange(newValue);

      // Reset typing flag after debounce completes
      setTimeout(() => {
        isUserTypingRef.current = false;
      }, 350);
    }
  };

  return (
    <div className={cn("p-1", className)}>
      <Input
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder || "Enter text..."}
        className="text-xs leading-tight h-6 px-1.5"
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
