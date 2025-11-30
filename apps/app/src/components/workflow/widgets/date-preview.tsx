import { Input } from "@/components/ui/input";
import { cn } from "@/utils/utils";

import type { BaseWidgetProps } from "./widget";
import { createWidget } from "./widget";

interface DatePreviewWidgetProps extends BaseWidgetProps {
  value: string;
}

function DatePreviewWidget({ value, className }: DatePreviewWidgetProps) {
  // Format ISO date string for display
  const formatDate = (isoString: string): string => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return isoString;
      return date.toLocaleString();
    } catch {
      return isoString;
    }
  };

  return (
    <div className={cn("p-2 h-full w-full", className)}>
      <Input
        type="text"
        value={formatDate(value)}
        readOnly
        disabled
        placeholder="No date"
        className="border border-neutral-300 dark:border-neutral-700"
      />
    </div>
  );
}

export const datePreviewWidget = createWidget({
  component: DatePreviewWidget,
  nodeTypes: ["preview-date"],
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
