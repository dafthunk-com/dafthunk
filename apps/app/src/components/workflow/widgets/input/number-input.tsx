import { cn } from "@/utils/utils";

import { NumberField } from "../../fields/number-field";
import type { BaseWidgetProps } from "../widget";
import { createWidget, getInputValue } from "../widget";

interface NumberInputWidgetProps extends BaseWidgetProps {
  value: number;
}

function NumberInputWidget({
  value,
  onChange,
  className,
  readonly = false,
}: NumberInputWidgetProps) {
  return (
    <div className={cn("p-2", className)}>
      <NumberField
        parameter={{ id: "input", name: "value", type: "number" }}
        value={value}
        onChange={onChange}
        onClear={() => onChange(0)}
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
  }),
});
