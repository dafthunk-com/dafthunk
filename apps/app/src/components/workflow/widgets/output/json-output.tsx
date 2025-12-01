import { cn } from "@/utils/utils";

import { JsonField } from "../../fields/json-field";
import type { BaseWidgetProps } from "../widget";
import { createWidget } from "../widget";

interface JsonOutputWidgetProps extends BaseWidgetProps {
  value: unknown;
}

function JsonOutputWidget({ value, className }: JsonOutputWidgetProps) {
  return (
    <div className={cn("p-2 h-full w-full", className)}>
      <div className="h-[200px] relative nowheel nopan">
        <JsonField
          parameter={{ id: "output", name: "value", type: "json" }}
          value={value}
          onChange={() => {}}
          onClear={() => {}}
          disabled
        />
      </div>
    </div>
  );
}

export const jsonOutputWidget = createWidget({
  component: JsonOutputWidget,
  nodeTypes: ["output-json"],
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
