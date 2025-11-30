import { Input } from "@/components/ui/input";
import { cn } from "@/utils/utils";

import type { BaseWidgetProps } from "./widget";
import { createWidget } from "./widget";

interface NumberPreviewWidgetProps extends BaseWidgetProps {
  value: string;
}

function NumberPreviewWidget({ value, className }: NumberPreviewWidgetProps) {
  return (
    <div className={cn("p-2 h-full w-full", className)}>
      <Input
        type="text"
        value={value ?? ""}
        readOnly
        disabled
        placeholder="No value"
        className="border border-neutral-300 dark:border-neutral-700"
      />
    </div>
  );
}

export const numberPreviewWidget = createWidget({
  component: NumberPreviewWidget,
  nodeTypes: ["preview-number"],
  inputField: "value",
  extractConfig: (_nodeId, inputs, outputs) => {
    const displayValueOutput = outputs?.find((o) => o.name === "displayValue");
    const valueInput = inputs.find((i) => i.name === "value");

    const valueToPreview =
      displayValueOutput?.value !== undefined
        ? displayValueOutput.value
        : valueInput?.value;

    return {
      value: valueToPreview !== undefined ? String(valueToPreview) : "",
    };
  },
});
