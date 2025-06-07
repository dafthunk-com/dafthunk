import { Editor } from "@monaco-editor/react";

import { Label } from "@/components/ui/label";

interface JavaScriptEditorWidgetConfig {
  value: string;
}

interface JavaScriptEditorWidgetProps {
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
        className={`${compact ? "h-[200px]" : "h-[400px]"} overflow-visible border relative`}
      >
        <Editor
          height="100%"
          defaultLanguage="javascript"
          defaultValue={value}
          theme="vs"
          options={{
            minimap: { enabled: false },
            lineNumbers: "on",
            lineNumbersMinChars: 3,
            lineDecorationsWidth: 0,
            glyphMargin: false,
            folding: true,
            fontSize: compact ? 8 : 14,
            automaticLayout: true,
            padding: { top: 0, bottom: 0 },
            scrollbar: {
              vertical: "visible",
              horizontal: "visible",
              useShadows: false,
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
              verticalSliderSize: 8,
              horizontalSliderSize: 8,
              arrowSize: 0,
            },
            renderLineHighlight: "all",
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            overviewRulerLanes: 0,
            fixedOverflowWidgets: false,
            roundedSelection: false,
            formatOnPaste: true,
            formatOnType: true,
            wordWrap: "on",
            renderWhitespace: "selection",
            bracketPairColorization: {
              enabled: true,
            },
            guides: {
              indentation: true,
              highlightActiveIndentation: true,
              bracketPairs: true,
            },
            renderFinalNewline: "on",
            renderLineHighlightOnlyWhenFocus: false,
            renderValidationDecorations: "on",
          }}
          onChange={handleEditorChange}
        />
      </div>
    </div>
  );
} 