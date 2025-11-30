import { TextField } from "../fields/text-field";
import type { BaseWidgetProps } from "./widget";
import { createWidget } from "./widget";

interface TextPreviewWidgetProps extends BaseWidgetProps {
  value: string;
}

function TextPreviewWidget({ value, className }: TextPreviewWidgetProps) {
  return (
    <TextField
      parameter={{ id: "preview", name: "value", type: "string" }}
      value={value ?? ""}
      onChange={() => {}}
      onClear={() => {}}
      disabled
      asWidget
      className={className}
    />
  );
}

export const textPreviewWidget = createWidget({
  component: TextPreviewWidget,
  nodeTypes: ["preview-text"],
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
