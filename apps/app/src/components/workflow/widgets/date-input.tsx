import { cn } from "@/utils/utils";

import { DateField } from "../fields/date-field";
import type { BaseWidgetProps } from "./widget";
import { createWidget, getInputValue } from "./widget";

interface DateInputWidgetProps extends BaseWidgetProps {
  value: string;
}

function DateInputWidget({
  value,
  onChange,
  className,
  readonly = false,
}: DateInputWidgetProps) {
  return (
    <div className={cn("p-2", className)}>
      <DateField
        parameter={{ id: "input", name: "value", type: "date" }}
        value={value}
        onChange={onChange}
        onClear={() => onChange("")}
        disabled={readonly}
      />
    </div>
  );
}

export const dateInputWidget = createWidget({
  component: DateInputWidget,
  nodeTypes: ["date-input"],
  inputField: "value",
  extractConfig: (_nodeId, inputs) => ({
    value: getInputValue(inputs, "value", ""),
  }),
});
