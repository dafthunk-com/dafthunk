import { Editor } from "@monaco-editor/react";

import { Label } from "@/components/ui/label";

import type { WorkflowParameter } from "../workflow-types";

export interface JavaScriptEditorWidgetProps {
  type: "javascript-editor";
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  compact?: boolean;
  readonly?: boolean;
}

export type JavaScriptEditorWidgetConfig = Omit<
  JavaScriptEditorWidgetProps,
  "onChange" | "className" | "compact" | "readonly"
>;

export const JavaScriptEditorWidgetMeta = {
  nodeTypes: ["javascript-editor"],
  inputField: "value",
  createConfig: (
    nodeId: string,
    inputs: WorkflowParameter[]
  ): JavaScriptEditorWidgetConfig => {
    const valueInput = inputs.find((i) => i.id === "value");

    if (!valueInput) {
      console.warn(
        `Missing required inputs for JavaScript Editor widget in node ${nodeId}`
      );
      return null as any;
    }

    return {
      type: "javascript-editor",
      id: nodeId,
      name: "JavaScript Editor",
      value: String(valueInput.value || "// Write your JavaScript code here"),
    };
  },
};

export function JavaScriptEditorWidget({
  value,
  onChange,
  compact = false,
}: JavaScriptEditorWidgetProps) {
  const handleEditorChange = (value: string | undefined) => {
    if (!value) {
      onChange("// Write your JavaScript code here");
      return;
    }
    onChange(value);
  };

  return (
    <div className="space-y-2">
      {!compact && <Label>JavaScript Editor</Label>}
      <div
        className={`${compact ? "h-[200px]" : "h-[400px]"} overflow-visible relative`}
      >
        <Editor
          height="100%"
          defaultLanguage="javascript"
          defaultValue={value}
          theme="vs"
          options={{
            minimap: { enabled: false },
            lineNumbers: "on",
            lineNumbersMinChars: 2,
            lineDecorationsWidth: 4,
            glyphMargin: false,
            folding: false,
            fontSize: compact ? 8 : 12,
            automaticLayout: true,
            padding: { top: 0, bottom: 0 },
            scrollbar: {
              vertical: "visible",
              horizontal: "visible",
              useShadows: false,
              verticalScrollbarSize: 4,
              horizontalScrollbarSize: 4,
              verticalSliderSize: 4,
              horizontalSliderSize: 4,
              arrowSize: 0,
            },
            renderLineHighlight: "none",
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            overviewRulerLanes: 0,
            fixedOverflowWidgets: false,
            roundedSelection: false,
            formatOnPaste: true,
            formatOnType: true,
            wordWrap: "on",
            renderWhitespace: "none",
            bracketPairColorization: {
              enabled: false,
            },
            guides: {
              indentation: false,
              highlightActiveIndentation: false,
              bracketPairs: false,
            },
            renderFinalNewline: "on",
            renderLineHighlightOnlyWhenFocus: true,
            renderValidationDecorations: "off",
          }}
          onChange={handleEditorChange}
        />
      </div>
    </div>
  );
}
