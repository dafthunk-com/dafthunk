import { useEffect, useRef, useState } from "react";

import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/utils/utils";

import type { BaseWidgetProps } from "./widget";
import { createWidget, getInputValue, useDebouncedChange } from "./widget";

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

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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
    <div className={cn(compact ? "p-1" : "p-2", className)}>
      <Textarea
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder || "Enter text..."}
        className={cn(
          compact && "min-h-[100px] text-[0.6rem] leading-tight p-1.5"
        )}
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
