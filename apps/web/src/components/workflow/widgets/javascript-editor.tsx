import { Editor } from "@monaco-editor/react";

import { cn } from "@/utils/utils";

import type { BaseWidgetProps } from "./widget";
import { createWidget, getInputValue } from "./widget";

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
  const handleEditorChange = (value: string | undefined) => {
    if (readonly) return;

    if (!value) {
      onChange("// Write your JavaScript code here");
      return;
    }
    onChange(value);
  };

  return (
    <div className={cn("p-2", className)}>
      <div className={cn(compact ? "h-[200px]" : "h-[400px]", "relative")}>
        <Editor
          height="100%"
          defaultLanguage="javascript"
          defaultValue={value}
          theme="vs"
          options={{
            minimap: { enabled: false },
            lineNumbers: "on",
            lineNumbersMinChars: 2,
            fontSize: compact ? 8 : 12,
            automaticLayout: true,
            wordWrap: "on",
            readOnly: readonly,
            scrollbar: {
              verticalScrollbarSize: 4,
              horizontalScrollbarSize: 4,
            },
          }}
          onChange={handleEditorChange}
        />
      </div>
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
