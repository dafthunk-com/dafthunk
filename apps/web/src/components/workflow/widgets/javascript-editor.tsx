import { cn } from "@/utils/utils";

import type { BaseWidgetProps } from "./widget";
import { createWidget, getInputValue } from "./widget";
import { CodeEditor } from "./code-editor";

interface JavaScriptEditorWidgetProps extends BaseWidgetProps {
  value: string;
}

function JavaScriptEditorWidget({
  value,
  onChange,
  className,
  compact = false,
  readonly = false,
}: JavaScriptEditorWidgetProps) {
  const handleEditorChange = (value: string) => {
    if (readonly) return;

    if (!value) {
      onChange("// Write your JavaScript code here");
      return;
    }
    onChange(value);
  };

  return (
    <div className={cn("p-2", className)}>
      <CodeEditor
        value={value}
        onChange={handleEditorChange}
        language="javascript"
        readonly={readonly}
        height={compact ? "200px" : "400px"}
        fontSize={compact ? 8 : 12}
      />
    </div>
  );
}

export const javascriptEditorWidget = createWidget({
  component: JavaScriptEditorWidget,
  nodeTypes: ["javascript-editor"],
  inputField: "value",
  extractConfig: (_nodeId, inputs) => ({
    value: getInputValue(inputs, "value", "// Write your JavaScript code here"),
  }),
});
