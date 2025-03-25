import { Editor } from "@monaco-editor/react";
import { Label } from "@/components/ui/label";

interface MonacoEditorWidgetConfig {
  value: string;
  language?: string;
}

interface MonacoEditorWidgetProps {
  config: MonacoEditorWidgetConfig;
  onChange: (value: string) => void;
  compact?: boolean;
}

export function MonacoEditorWidget({ config, onChange, compact = false }: MonacoEditorWidgetProps) {
  const { value, language = "javascript" } = config;

  return (
    <div className="space-y-2">
      {!compact && <Label>Code Editor</Label>}
      <div className={`${compact ? "h-[200px]" : "h-[400px]"} overflow-visible border relative`}>
        <Editor
          height="100%"
          defaultLanguage={language}
          defaultValue={value}
          theme="vs"
          options={{
            minimap: { enabled: false },
            lineNumbers: "off",
            lineNumbersMinChars: 0,
            lineDecorationsWidth: 0,
            glyphMargin: false,
            folding: false,
            fontSize: compact ? 8 : 14,
            automaticLayout: true,
            padding: { top: 0, bottom: 0 },
            scrollbar: {
              vertical: 'visible',
              horizontal: 'visible',
              useShadows: false,
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
              verticalSliderSize: 8,
              horizontalSliderSize: 8,
              arrowSize: 0,
            },
            renderLineHighlight: 'none',
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            overviewRulerLanes: 0,
            fixedOverflowWidgets: false,
            roundedSelection: false,
            guides: {
              indentation: false,
              highlightActiveIndentation: false,
              bracketPairs: false
            },
            suggest: {
              showInlineDetails: false,
              showStatusBar: false,
              preview: false
            }
          }}
          onChange={(value) => onChange(value || "")}
        />
      </div>
    </div>
  );
} 