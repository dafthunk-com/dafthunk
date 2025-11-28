import { json } from "@codemirror/lang-json";
import {
  defaultHighlightStyle,
  syntaxHighlighting,
} from "@codemirror/language";
import { Compartment, EditorState } from "@codemirror/state";
import { EditorView, lineNumbers } from "@codemirror/view";
import { type GeoJSONSvgOptions, geojsonToSvg } from "@dafthunk/utils";
import { useEffect, useRef } from "react";

import { CodeBlock } from "@/components/docs/code-block";
import { cn } from "@/utils/utils";

import { ClearButton } from "./clear-button";
import type { FieldProps } from "./types";

export function GeoJSONField({
  className,
  clearable,
  connected,
  disabled,
  onChange,
  onClear,
  value,
  asWidget,
}: FieldProps) {
  // GeoJSON fields check for null explicitly (null is a valid but empty GeoJSON)
  const hasValue = value !== undefined && value !== null;

  // Refs for CodeMirror editor management
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const readonlyCompartment = useRef(new Compartment());
  const isFormattingRef = useRef(false); // Prevents infinite loops during auto-formatting

  // Keep onChange ref up to date without triggering editor recreation
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const readonly = disabled ?? false;

  // Helper to format GeoJSON value as pretty-printed JSON string
  const formatGeoJSON = (value: any): string => {
    try {
      return JSON.stringify(value, null, 2);
    } catch (e) {
      console.warn("Error formatting GeoJSON:", e);
      return String(value);
    }
  };

  // Helper to render GeoJSON as SVG for visual preview
  const renderGeoJSONSvg = (geojson: any) => {
    if (!geojson) {
      return { svg: "", error: null };
    }

    try {
      const options: GeoJSONSvgOptions = {
        width: 400,
        height: 300,
        strokeColor: "#3b82f6",
        strokeWidth: 2,
        fillColor: "rgba(59, 130, 246, 0.2)",
        backgroundColor: "#f8fafc",
      };

      const result = geojsonToSvg(geojson, options);

      // Make SVG responsive with 100% width
      if (result.svg && !result.error) {
        const responsiveSvg = result.svg
          .replace(/width="[^"]*"/, 'width="100%"')
          .replace(/height="[^"]*"/, 'height="auto"')
          .replace(
            /<svg([^>]*)>/,
            `<svg$1 viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">`
          );

        return { svg: responsiveSvg, error: result.error };
      }

      return { svg: result.svg, error: result.error };
    } catch (err) {
      console.error("Error rendering GeoJSON:", err);
      return {
        svg: "",
        error: `Error rendering GeoJSON: ${err instanceof Error ? err.message : "Unknown error"}`,
      };
    }
  };

  const formattedValue = hasValue ? formatGeoJSON(value) : "";

  // Determine if we should show the editor (not disabled state)
  const shouldShowEditor = !disabled;

  // Create CodeMirror editor when needed
  useEffect(() => {
    if (!editorRef.current || !shouldShowEditor) return;

    // Don't recreate if editor already exists
    if (viewRef.current) return;

    const view = new EditorView({
      state: EditorState.create({
        doc: formattedValue,
        extensions: [
          json(),
          syntaxHighlighting(defaultHighlightStyle),
          lineNumbers(),
          EditorView.lineWrapping,
          readonlyCompartment.current.of(EditorState.readOnly.of(readonly)),
          // Auto-format JSON and update value on changes
          EditorView.updateListener.of((update) => {
            if (update.docChanged && !isFormattingRef.current && !readonly) {
              const newValue = update.state.doc.toString();

              if (!newValue) {
                onChangeRef.current?.(undefined);
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

                onChangeRef.current?.(parsed);
              } catch {
                // Allow invalid JSON while typing - keep string value
                onChangeRef.current?.(newValue);
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
              fontSize: "14px",
            },
            ".cm-scroller": {
              overflow: "auto",
            },
            ".cm-gutters": {
              fontSize: "14px",
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
  }, [shouldShowEditor, formattedValue, readonly]); // Recreate when transitioning to showing editor

  // Update editor content when external value changes
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

  // Update editor readonly state when disabled prop changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    view.dispatch({
      effects: readonlyCompartment.current.reconfigure(
        EditorState.readOnly.of(readonly)
      ),
    });
  }, [readonly]);

  // Disabled state without value - show placeholder message
  if (disabled && !hasValue) {
    return (
      <div
        className={cn(
          "text-xs text-neutral-500 italic",
          !asWidget && "p-2 bg-muted/50 rounded-md border border-border",
          className
        )}
      >
        {connected ? "Connected" : "No GeoJSON"}
      </div>
    );
  }

  // Disabled state with value - show SVG preview and JSON code block
  if (disabled) {
    const result = hasValue
      ? renderGeoJSONSvg(value)
      : { svg: "", error: null };

    return (
      <div className={cn("space-y-2", className)}>
        {/* Preview above JSON - always visible with 200px height */}
        {result.error ? (
          <div
            className={cn(
              "h-[200px] flex items-center justify-center text-xs text-red-500 p-2 bg-red-50 dark:bg-red-900 dark:text-red-400 dark:border dark:border-red-800",
              !asWidget && "rounded-md"
            )}
          >
            {result.error}
          </div>
        ) : result.svg ? (
          <div
            className={cn(
              "h-[200px] border border-border bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center",
              !asWidget && "rounded-md"
            )}
          >
            <div
              className="w-full h-full"
              dangerouslySetInnerHTML={{ __html: result.svg }}
            />
          </div>
        ) : (
          <div
            className={cn(
              "h-[200px] border border-border bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center",
              !asWidget && "rounded-md"
            )}
          >
            <span className="text-neutral-500 dark:text-neutral-400 text-xs">
              {hasValue ? "No geometries to display" : "No GeoJSON"}
            </span>
          </div>
        )}

        {/* JSON Code Block */}
        {hasValue && (
          <div
            className={cn(
              "border border-border bg-muted/50 overflow-auto",
              !asWidget && "rounded-md"
            )}
          >
            <CodeBlock language="json" className="text-xs my-0 [&_pre]:p-2">
              {formattedValue}
            </CodeBlock>
          </div>
        )}
      </div>
    );
  }

  // Enabled state - show SVG preview and editable CodeMirror editor
  const result = hasValue ? renderGeoJSONSvg(value) : { svg: "", error: null };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Preview above editor - always visible with 200px height */}
      {result.error ? (
        <div
          className={cn(
            "h-[200px] flex items-center justify-center text-xs text-red-500 p-2 bg-red-50 dark:bg-red-900 dark:text-red-400 dark:border dark:border-red-800",
            !asWidget && "rounded-md"
          )}
        >
          {result.error}
        </div>
      ) : result.svg ? (
        <div
          className={cn(
            "h-[200px] border border-border bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center",
            !asWidget && "rounded-md"
          )}
        >
          <div
            className="w-full h-full"
            dangerouslySetInnerHTML={{ __html: result.svg }}
          />
        </div>
      ) : (
        <div
          className={cn(
            "h-[200px] border border-border bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center",
            !asWidget && "rounded-md"
          )}
        >
          <span className="text-neutral-500 dark:text-neutral-400 text-xs">
            {hasValue ? "No geometries to display" : "No GeoJSON"}
          </span>
        </div>
      )}

      {/* CodeMirror editor */}
      <div
        className="relative"
        onWheelCapture={(e) => {
          // Capture wheel events at container level to prevent parent scroll
          e.stopPropagation();
        }}
      >
        <div
          ref={editorRef}
          className={cn(
            "h-[200px] border border-neutral-300 dark:border-neutral-700 overflow-auto bg-neutral-100/50 dark:bg-neutral-900",
            !asWidget && "rounded-md"
          )}
        />
        {!disabled && !readonly && clearable && hasValue && (
          <ClearButton
            onClick={onClear}
            label="Clear GeoJSON"
            className="absolute top-2 right-2 z-10"
          />
        )}
      </div>
    </div>
  );
}
