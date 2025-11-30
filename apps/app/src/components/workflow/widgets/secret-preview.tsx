import { Input } from "@/components/ui/input";
import { cn } from "@/utils/utils";

import type { BaseWidgetProps } from "./widget";
import { createWidget } from "./widget";

interface SecretPreviewWidgetProps extends BaseWidgetProps {
  value: string;
}

function SecretPreviewWidget({ value, className }: SecretPreviewWidgetProps) {
  // Mask the secret value
  const maskedValue = value ? "••••••••" : "";

  return (
    <div className={cn("p-2 h-full w-full", className)}>
      <Input
        type="text"
        value={maskedValue}
        readOnly
        disabled
        placeholder="No secret"
        className="border border-neutral-300 dark:border-neutral-700"
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
