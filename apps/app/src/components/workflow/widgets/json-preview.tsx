import { CodeBlock } from "@/components/docs/code-block";
import { cn } from "@/utils/utils";

import type { BaseWidgetProps } from "./widget";
import { createWidget } from "./widget";

interface JsonPreviewWidgetProps extends BaseWidgetProps {
  value: unknown;
}

function JsonPreviewWidget({ value, className }: JsonPreviewWidgetProps) {
  const hasValue = value !== undefined && value !== null && value !== "";

  // Format value as pretty-printed JSON string
  const formatJson = (val: unknown): string => {
    if (val === undefined || val === null) return "";
    try {
      if (typeof val === "object") {
        return JSON.stringify(val, null, 2);
      }
      // Try to parse string as JSON
      const parsed = JSON.parse(String(val));
      return JSON.stringify(parsed, null, 2);
    } catch {
      return String(val);
    }
  };

  const formattedValue = formatJson(value);

  return (
    <div className={cn("p-2 h-full w-full", className)}>
      <div className="border border-neutral-300 dark:border-neutral-700 rounded-md overflow-hidden min-h-[100px] max-h-[300px] overflow-y-auto">
        {hasValue ? (
          <CodeBlock language="json" className="text-xs my-0 [&_pre]:p-2">
            {formattedValue}
          </CodeBlock>
        ) : (
          <div className="flex items-center justify-center h-[100px] bg-muted/30">
            <span className="text-xs text-muted-foreground">No JSON</span>
          </div>
        )}
      </div>
    </div>
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
