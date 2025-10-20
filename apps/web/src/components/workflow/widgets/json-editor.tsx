import { Editor } from "@monaco-editor/react";

import { cn } from "@/utils/utils";

import type { BaseWidgetProps } from "./widget";
import { createWidget, getInputValue } from "./widget";

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
  const handleEditorChange = (value: string | undefined) => {
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
      <div className={cn(compact ? "h-[200px]" : "h-[400px]", "relative")}>
        <Editor
          height="100%"
          defaultLanguage="json"
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

export const jsonEditorWidget = createWidget({
  component: JsonEditorWidget,
  nodeTypes: ["json-editor"],
  inputField: "value",
  extractConfig: (_nodeId, inputs) => ({
    value: getInputValue(inputs, "value", "{}"),
  }),
});
