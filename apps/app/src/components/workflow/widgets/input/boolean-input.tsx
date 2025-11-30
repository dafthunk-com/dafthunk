import { cn } from "@/utils/utils";

import { BooleanField } from "../../fields/boolean-field";
import type { BaseWidgetProps } from "../widget";
import { createWidget, getInputValue } from "../widget";

interface BooleanInputWidgetProps extends BaseWidgetProps {
  value: boolean;
}

function BooleanInputWidget({
  value,
  onChange,
  className,
  readonly = false,
}: BooleanInputWidgetProps) {
  return (
    <div className={cn("p-2", className)}>
      <BooleanField
        parameter={{ id: "input", name: "value", type: "boolean" }}
        value={value}
        onChange={(v) => onChange(v === "true")}
        onClear={() => onChange(false)}
        disabled={readonly}
      />
    </div>
  );
}

export const booleanInputWidget = createWidget({
  component: BooleanInputWidget,
  nodeTypes: ["boolean-input"],
  inputField: "value",
  extractConfig: (_nodeId, inputs) => ({
    value: getInputValue(inputs, "value", false),
  }),
});
