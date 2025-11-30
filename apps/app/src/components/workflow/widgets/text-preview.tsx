import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/utils/utils";

import type { BaseWidgetProps } from "./widget";
import { createWidget } from "./widget";

interface TextPreviewWidgetProps extends BaseWidgetProps {
  value: string;
}

function TextPreviewWidget({ value, className }: TextPreviewWidgetProps) {
  return (
    <div className={cn("p-2 h-full w-full", className)}>
      <Textarea
        value={value ?? ""}
        readOnly
        className="resize-none min-h-[100px] h-full w-full overflow-y-auto border focus-visible:ring-0 focus-visible:ring-offset-0 text-xs leading-tight"
        disabled
      />
    </div>
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
