import { json } from "@codemirror/lang-json";
import {
  defaultHighlightStyle,
  syntaxHighlighting,
} from "@codemirror/language";
import { Compartment, EditorState } from "@codemirror/state";
import { EditorView, lineNumbers } from "@codemirror/view";
import { useEffect, useRef } from "react";

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
  readonly = false,
}: JsonEditorWidgetProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const readonlyCompartment = useRef(new Compartment());
  const isFormattingRef = useRef(false);

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
          json(),
          syntaxHighlighting(defaultHighlightStyle),
          lineNumbers(),
          EditorView.lineWrapping,
          readonlyCompartment.current.of(EditorState.readOnly.of(readonly)),
          EditorView.updateListener.of((update) => {
            if (update.docChanged && !isFormattingRef.current) {
              const newValue = update.state.doc.toString();

              if (!newValue) {
                onChangeRef.current("{}");
                return;
              }

              try {
                const parsed = JSON.parse(newValue);
                const formatted = JSON.stringify(parsed, null, 2);

                if (formatted !== newValue) {
                  // Format in place while preserving cursor position
                  isFormattingRef.current = true;

                  // Get current cursor position
                  const cursorPos = update.state.selection.main.head;

                  // Count non-whitespace characters before cursor to maintain relative position
                  let contentChars = 0;
                  for (let i = 0; i < cursorPos && i < newValue.length; i++) {
                    if (!/\s/.test(newValue[i])) contentChars++;
                  }

                  // Find new cursor position with same number of content characters
                  let newCursorPos = 0;
                  let count = 0;
                  for (let i = 0; i < formatted.length; i++) {
                    if (!/\s/.test(formatted[i])) {
                      count++;
                      if (count >= contentChars) {
                        newCursorPos = i + 1;
                        break;
                      }
                    }
                  }

                  // Dispatch formatting change with preserved cursor
                  update.view.dispatch({
                    changes: {
                      from: 0,
                      to: newValue.length,
                      insert: formatted,
                    },
                    selection: { anchor: newCursorPos },
                  });

                  // Reset flag after dispatch
                  Promise.resolve().then(() => {
                    isFormattingRef.current = false;
                  });
                }

                onChangeRef.current(formatted);
              } catch (_) {
                onChangeRef.current(newValue);
              }
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
            },
            ".cm-scroller": {
              overflow: "auto",
            },
            ".cm-gutters": {
              fontSize: "8px",
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
    if (!view || isFormattingRef.current) return;

    const currentValue = view.state.doc.toString();

    // Don't update if values are semantically equal (same JSON object)
    try {
      const currentParsed = JSON.parse(currentValue);
      const newParsed = JSON.parse(value);
      if (JSON.stringify(currentParsed) === JSON.stringify(newParsed)) {
        return;
      }
    } catch {
      // If either fails to parse, fall through to string comparison
    }

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

export const jsonEditorWidget = createWidget({
  component: JsonEditorWidget,
  nodeTypes: ["json-editor"],
  inputField: "value",
  extractConfig: (_nodeId, inputs) => ({
    value: getInputValue(inputs, "value", "{}"),
  }),
});
