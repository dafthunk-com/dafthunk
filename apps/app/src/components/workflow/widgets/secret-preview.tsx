import { cn } from "@/utils/utils";

import { SecretField } from "../fields/secret-field";
import type { BaseWidgetProps } from "./widget";
import { createWidget } from "./widget";

interface SecretPreviewWidgetProps extends BaseWidgetProps {
  value: string;
}

function SecretPreviewWidget({ value, className }: SecretPreviewWidgetProps) {
  return (
    <div className={cn("p-2", className)}>
      <SecretField
        parameter={{ id: "preview", name: "value", type: "secret" }}
        value={value ?? ""}
        onChange={() => {}}
        onClear={() => {}}
        disabled
      />
    </div>
  );
}

export const secretPreviewWidget = createWidget({
  component: SecretPreviewWidget,
  nodeTypes: ["preview-secret"],
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
