import { Switch } from "@/components/ui/switch";
import { cn } from "@/utils/utils";

import type { BaseWidgetProps } from "./widget";
import { createWidget } from "./widget";

interface BooleanPreviewWidgetProps extends BaseWidgetProps {
  value: boolean;
}

function BooleanPreviewWidget({
  value,
  className,
}: BooleanPreviewWidgetProps) {
  const boolValue = value !== undefined ? String(value) === "true" : false;

  return (
    <div
      className={cn(
        "p-2 h-full w-full flex items-center justify-start",
        className
      )}
    >
      <Switch checked={boolValue} disabled />
    </div>
  );
}

export const booleanPreviewWidget = createWidget({
  component: BooleanPreviewWidget,
  nodeTypes: ["preview-boolean"],
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
