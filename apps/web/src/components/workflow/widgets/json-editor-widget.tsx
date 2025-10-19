import { Editor } from "@monaco-editor/react";

import { Label } from "@/components/ui/label";

export interface JsonEditorWidgetConfig {
  type: "json-editor";
  id: string;
  name: string;
  value: string;
}

export interface JsonEditorWidgetProps {
  config: JsonEditorWidgetConfig;
  onChange: (value: string) => void;
  compact?: boolean;
}

export function JsonEditorWidget({
  config,
  onChange,
  compact = false,
}: JsonEditorWidgetProps) {
  const { value } = config;

  const handleEditorChange = (value: string | undefined) => {
    if (!value) {
      onChange("{}");
      return;
    }

    try {
      // Parse and stringify to validate and format JSON
      const parsed = JSON.parse(value);
      const formatted = JSON.stringify(parsed, null, 2);
      onChange(formatted);
    } catch (_) {
      // If invalid JSON, just pass through the raw value
      onChange(value);
    }
  };

  return (
    <div className="space-y-2">
      {!compact && <Label>JSON Editor</Label>}
      <div
        className={`${compact ? "h-[200px]" : "h-[400px]"} overflow-visible relative`}
      >
        <Editor
          height="100%"
          defaultLanguage="json"
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
