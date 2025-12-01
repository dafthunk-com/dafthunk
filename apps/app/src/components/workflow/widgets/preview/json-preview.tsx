import { cn } from "@/utils/utils";

import { JsonField } from "../../fields/json-field";
import type { BaseWidgetProps } from "../widget";
import { createWidget } from "../widget";

interface JsonPreviewWidgetProps extends BaseWidgetProps {
  value: unknown;
}

function JsonPreviewWidget({ value, className }: JsonPreviewWidgetProps) {
  return (
    <div className={cn("p-2 h-full w-full", className)}>
      <div className="h-[200px] relative nowheel nopan">
        <JsonField
          value={value}
          onChange={() => {}}
          disabled
        />
      </div>
    </div>
  );
}

export const jsonPreviewWidget = createWidget({
  component: JsonPreviewWidget,
  nodeTypes: ["preview-json"],
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
