import { useEffect, useRef } from "react";

import { CodeEditor } from "@/components/ui/code-editor";
import { cn } from "@/utils/utils";

import type { BaseWidgetProps } from "../widget";
import { createWidget, getInputValue } from "../widget";

interface JavaScriptEditorWidgetProps extends BaseWidgetProps {
  value: string;
}

function JavaScriptEditorWidget({
  value,
  onChange,
  className,
  readonly = false,
}: JavaScriptEditorWidgetProps) {
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const handleChange = (newValue: string) => {
    if (!newValue) {
      onChangeRef.current("// Write your JavaScript code here");
      return;
    }
    onChangeRef.current(newValue);
  };

  return (
    <div className={cn(className)}>
      <div className="h-[200px] relative nowheel nopan">
        <CodeEditor
          value={value}
          onChange={handleChange}
          language="javascript"
          readonly={readonly}
        />
      </div>
    </div>
  );
}

export const javascriptInputWidget = createWidget({
  component: JavaScriptEditorWidget,
  nodeTypes: ["javascript-input"],
  inputField: "javascript",
  extractConfig: (_nodeId, inputs) => ({
    value: getInputValue(
      inputs,
      "javascript",
      "// Write your JavaScript code here"
    ),
  }),
});
