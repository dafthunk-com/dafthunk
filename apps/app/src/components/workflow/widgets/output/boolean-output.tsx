import { cn } from "@/utils/utils";

import { BooleanField } from "../../fields/boolean-field";
import type { BaseWidgetProps } from "../widget";
import { createWidget } from "../widget";

interface BooleanOutputWidgetProps extends BaseWidgetProps {
  value: boolean;
}

function BooleanOutputWidget({ value, className }: BooleanOutputWidgetProps) {
  return (
    <div className={cn("p-2", className)}>
      <BooleanField
        parameter={{ id: "preview", name: "value", type: "boolean" }}
        value={value}
        onChange={() => {}}
        onClear={() => {}}
        disabled
      />
    </div>
  );
}

export const booleanOutputWidget = createWidget({
  component: BooleanOutputWidget,
  nodeTypes: ["output-boolean"],
  inputField: "value",
  extractConfig: (_nodeId, inputs, outputs) => {
    const displayValueOutput = outputs?.find((o) => o.name === "displayValue");
    const valueInput = inputs.find((i) => i.name === "value");

    const valueToPreview =
      displayValueOutput?.value !== undefined
        ? displayValueOutput.value
        : valueInput?.value;

    return {
      value: valueToPreview,
    };
  },
});
