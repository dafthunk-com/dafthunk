import { cn } from "@/utils/utils";

import type { BaseWidgetProps } from "./widget";
import { createWidget, getInputValue } from "./widget";
import { CodeEditor } from "./code-editor";

interface JsonEditorWidgetProps extends BaseWidgetProps {
  value: string;
}

function JsonEditorWidget({
  value,
  onChange,
  className,
  compact = false,
  readonly = false,
}: JsonEditorWidgetProps) {
  const handleEditorChange = (value: string) => {
    if (readonly) return;

    if (!value) {
      onChange("{}");
      return;
    }

    try {
      const parsed = JSON.parse(value);
      const formatted = JSON.stringify(parsed, null, 2);
      onChange(formatted);
    } catch (_) {
      onChange(value);
    }
  };

  return (
    <div className={cn("p-2", className)}>
      <CodeEditor
        value={value}
        onChange={handleEditorChange}
        language="json"
        readonly={readonly}
        height={compact ? "200px" : "400px"}
        fontSize={compact ? 8 : 12}
      />
    </div>
  );
}

export const jsonEditorWidget = createWidget({
  component: JsonEditorWidget,
  nodeTypes: ["json-editor"],
  inputField: "value",
  extractConfig: (_nodeId, inputs) => ({
    value: getInputValue(inputs, "value", "{}"),
  }),
});
