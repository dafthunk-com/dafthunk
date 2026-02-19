import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { sql } from "@codemirror/lang-sql";
import { xml } from "@codemirror/lang-xml";
import {
  defaultHighlightStyle,
  syntaxHighlighting,
} from "@codemirror/language";
import { Compartment, EditorState, Extension } from "@codemirror/state";
import { EditorView, lineNumbers } from "@codemirror/view";
import { useEffect, useRef } from "react";

import { cn } from "@/utils/utils";

type Language = "json" | "javascript" | "sql" | "html" | "xml" | "text";

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: Language;
  readonly?: boolean;
  className?: string;
}

function getLanguageExtension(language: Language): Extension {
  switch (language) {
    case "json":
      return json();
    case "javascript":
      return javascript();
    case "sql":
      return sql();
    case "html":
      return html();
    case "xml":
      return xml();
    case "text":
    default:
      return [];
  }
}

const baseTheme = EditorView.baseTheme({
  "&.cm-focused": {
    outline: "none !important",
  },
});

const theme = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "12px",
    backgroundColor: "hsl(var(--muted) / 0.5)",
  },
  ".cm-scroller": {
    overflow: "auto",
    fontFamily: "ui-monospace, monospace",
  },
  ".cm-gutters": {
    fontSize: "12px",
    backgroundColor: "hsl(var(--muted) / 0.5)",
    color: "hsl(var(--muted-foreground))",
    border: "none",
  },
});

export function CodeEditor({
  value,
  onChange,
  language = "text",
  readonly = false,
  className,
}: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const readonlyCompartment = useRef(new Compartment());
  const isProgrammaticUpdate = useRef(false);

  // Keep onChange ref up to date
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Create editor on mount
  useEffect(() => {
    if (!editorRef.current) return;

    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          getLanguageExtension(language),
          syntaxHighlighting(defaultHighlightStyle),
          lineNumbers(),
          baseTheme,
          theme,
          readonlyCompartment.current.of(EditorState.readOnly.of(readonly)),
          EditorView.updateListener.of((update) => {
            if (update.docChanged && !isProgrammaticUpdate.current) {
              onChangeRef.current?.(update.state.doc.toString());
            }
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
  }, [language]);

  // Update content when value changes externally
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentValue = view.state.doc.toString();
    if (currentValue !== value) {
      isProgrammaticUpdate.current = true;
      view.dispatch({
        changes: { from: 0, to: currentValue.length, insert: value },
      });
      isProgrammaticUpdate.current = false;
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

  return <div ref={editorRef} className={cn("h-full", className)} />;
}
