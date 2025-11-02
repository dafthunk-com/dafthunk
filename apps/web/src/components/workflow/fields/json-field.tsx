import { json } from "@codemirror/lang-json";
import {
  defaultHighlightStyle,
  syntaxHighlighting,
} from "@codemirror/language";
import { Compartment, EditorState } from "@codemirror/state";
import { EditorView, lineNumbers } from "@codemirror/view";
import { useEffect, useRef } from "react";

import { cn } from "@/utils/utils";

import { ClearButton } from "./clear-button";
import type { FieldProps } from "./types";

export function JsonField({
  parameter: _parameter,
  value,
  onChange,
  onClear,
  disabled,
  clearable,
  className,
  active: _active,
  connected,
}: FieldProps) {
  const hasValue = value !== undefined && value !== "";
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const readonlyCompartment = useRef(new Compartment());
  const isFormattingRef = useRef(false);

  // Serialize objects/arrays to JSON, or use string value
  const stringValue =
    value !== undefined
      ? typeof value === "object"
        ? JSON.stringify(value, null, 2)
        : String(value)
      : "";

  // Keep onChange ref up to date
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Disabled state without value
  if (disabled && !hasValue) {
    return (
      <div
        className={cn(
          "text-xs text-neutral-500 italic p-2 bg-muted/50 rounded-md border border-border",
          className
        )}
      >
        {connected ? "Connected" : "No value"}
      </div>
    );
  }

  const readonly = disabled ?? false;

  // Format value for display
  let formattedValue = stringValue;
  try {
    const parsed = JSON.parse(stringValue);
    formattedValue = JSON.stringify(parsed, null, 2);
  } catch {
    // If not valid JSON, show as-is
  }

  // Create editor once on mount
  useEffect(() => {
    if (!editorRef.current) return;

    const view = new EditorView({
      state: EditorState.create({
        doc: formattedValue,
        extensions: [
          json(),
          syntaxHighlighting(defaultHighlightStyle),
          lineNumbers(),
          EditorView.lineWrapping,
          readonlyCompartment.current.of(EditorState.readOnly.of(readonly)),
          EditorView.updateListener.of((update) => {
            if (update.docChanged && !isFormattingRef.current && !readonly) {
              const newValue = update.state.doc.toString();

              if (!newValue) {
                onChangeRef.current(undefined);
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
              } catch {
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
      const newParsed = JSON.parse(formattedValue);
      if (JSON.stringify(currentParsed) === JSON.stringify(newParsed)) {
        return;
      }
    } catch {
      // If either fails to parse, fall through to string comparison
    }

    if (currentValue !== formattedValue) {
      view.dispatch({
        changes: { from: 0, to: currentValue.length, insert: formattedValue },
      });
    }
  }, [formattedValue]);

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
    <div className={cn("relative", className)}>
      <div ref={editorRef} className="min-h-[80px]" />
      {!disabled && !readonly && clearable && hasValue && (
        <ClearButton
          onClick={onClear}
          label="Clear JSON"
          className="absolute top-2 right-2 z-10"
        />
      )}
    </div>
  );
}
