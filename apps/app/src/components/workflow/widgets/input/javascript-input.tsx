import { javascript } from "@codemirror/lang-javascript";
import {
  defaultHighlightStyle,
  syntaxHighlighting,
} from "@codemirror/language";
import { Compartment, EditorState } from "@codemirror/state";
import { EditorView, lineNumbers } from "@codemirror/view";
import { useEffect, useRef } from "react";

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
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const readonlyCompartment = useRef(new Compartment());

  // Keep onChange ref up to date
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Create editor once on mount
  useEffect(() => {
    if (!editorRef.current) return;

    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          javascript(),
          syntaxHighlighting(defaultHighlightStyle),
          lineNumbers(),
          EditorView.lineWrapping,
          readonlyCompartment.current.of(EditorState.readOnly.of(readonly)),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              const newValue = update.state.doc.toString();

              if (!newValue) {
                onChangeRef.current("// Write your JavaScript code here");
                return;
              }
              onChangeRef.current(newValue);
            }
          }),
          EditorView.baseTheme({
            "&.cm-focused": {
              outline: "none !important",
            },
          }),
          EditorView.theme({
            "&": {
              height: "100%",
              fontSize: "8px",
              backgroundColor: "rgba(245, 245, 245, 0.5)",
              color: "var(--cm-text, #000)",
            },
            "&.dark": {
              backgroundColor: "#1a1a1a",
              color: "#e0e0e0",
            },
            ".cm-scroller": {
              overflow: "auto",
            },
            ".cm-gutters": {
              fontSize: "8px",
              backgroundColor: "rgba(245, 245, 245, 0.5)",
              borderRight: "1px solid var(--cm-gutters-border, #e0e0e0)",
              color: "var(--cm-gutters-text, #666)",
            },
            ".dark .cm-gutters": {
              backgroundColor: "#1a1a1a",
              borderRightColor: "#333",
              color: "#999",
            },
            ".cm-linenumber": {
              color: "var(--cm-linenumber, #999)",
            },
            ".dark .cm-linenumber": {
              color: "#555",
            },
          }),
        ],
      }),
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // Update editor content when value prop changes externally
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentValue = view.state.doc.toString();
    if (currentValue !== value) {
      view.dispatch({
        changes: { from: 0, to: currentValue.length, insert: value },
      });
    }
  }, [value]);

  // Update readonly state
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    view.dispatch({
      effects: readonlyCompartment.current.reconfigure(
        EditorState.readOnly.of(readonly)
      ),
    });
  }, [readonly]);

  return (
    <div className={cn(className)}>
      <div className="h-[200px] relative nowheel nopan">
        <div ref={editorRef} className="h-full" />
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
