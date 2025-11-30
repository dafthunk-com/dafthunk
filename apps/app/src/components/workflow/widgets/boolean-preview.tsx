import { BooleanField } from "../fields/boolean-field";
import type { BaseWidgetProps } from "./widget";
import { createWidget } from "./widget";

interface BooleanPreviewWidgetProps extends BaseWidgetProps {
  value: boolean;
}

function BooleanPreviewWidget({ value, className }: BooleanPreviewWidgetProps) {
  return (
    <BooleanField
      parameter={{ id: "preview", name: "value", type: "boolean" }}
      value={value}
      onChange={() => {}}
      onClear={() => {}}
      disabled
      asWidget
      className={className}
    />
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
