import { JsonField } from "../fields/json-field";
import type { BaseWidgetProps } from "./widget";
import { createWidget } from "./widget";

interface JsonPreviewWidgetProps extends BaseWidgetProps {
  value: unknown;
}

function JsonPreviewWidget({ value, className }: JsonPreviewWidgetProps) {
  return (
    <JsonField
      parameter={{ id: "preview", name: "value", type: "json" }}
      value={value}
      onChange={() => {}}
      onClear={() => {}}
      disabled
      asWidget
      className={className}
    />
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
