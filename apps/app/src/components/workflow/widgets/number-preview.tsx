import { NumberField } from "../fields/number-field";
import type { BaseWidgetProps } from "./widget";
import { createWidget } from "./widget";

interface NumberPreviewWidgetProps extends BaseWidgetProps {
  value: string;
}

function NumberPreviewWidget({ value, className }: NumberPreviewWidgetProps) {
  return (
    <NumberField
      parameter={{ id: "preview", name: "value", type: "number" }}
      value={value ?? ""}
      onChange={() => {}}
      onClear={() => {}}
      disabled
      asWidget
      className={className}
    />
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
