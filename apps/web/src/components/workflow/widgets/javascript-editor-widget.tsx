import { Editor } from "@monaco-editor/react";

import { Label } from "@/components/ui/label";

export interface JavaScriptEditorWidgetConfig {
  type: "javascript-editor";
  id: string;
  name: string;
  value: string;
}

export interface JavaScriptEditorWidgetProps {
  config: JavaScriptEditorWidgetConfig;
  onChange: (value: string) => void;
  compact?: boolean;
}

export function JavaScriptEditorWidget({
  config,
  onChange,
  compact = false,
}: JavaScriptEditorWidgetProps) {
  const { value } = config;

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
