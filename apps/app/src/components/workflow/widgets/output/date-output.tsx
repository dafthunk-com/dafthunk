import { cn } from "@/utils/utils";

import { DateField } from "../../fields/date-field";
import type { BaseWidgetProps } from "../widget";
import { createWidget } from "../widget";

interface DateOutputWidgetProps extends BaseWidgetProps {
  value: string;
}

function DateOutputWidget({ value, className }: DateOutputWidgetProps) {
  return (
    <div className={cn("p-2", className)}>
      <DateField
        parameter={{ id: "preview", name: "value", type: "date" }}
        value={value ?? ""}
        onChange={() => {}}
        onClear={() => {}}
        disabled
      />
    </div>
  );
}

export const dateOutputWidget = createWidget({
  component: DateOutputWidget,
  nodeTypes: ["output-date"],
  inputField: "value",
  extractConfig: (_nodeId, inputs, outputs) => {
    const displayValueOutput = outputs?.find((o) => o.name === "displayValue");
    const valueInput = inputs.find((i) => i.name === "value");

    const valueToPreview =
      displayValueOutput?.value !== undefined
        ? displayValueOutput.value
        : valueInput?.value;

    return {
      value: valueToPreview ?? "",
    };
  },
});
