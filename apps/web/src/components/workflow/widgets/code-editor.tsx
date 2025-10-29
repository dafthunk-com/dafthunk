import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { defaultKeymap } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";

import { cn } from "@/utils/utils";

type Language = "javascript" | "json";

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: Language;
  readonly?: boolean;
  className?: string;
  height?: string;
  fontSize?: number;
}

const getLanguageExtension = (language: Language) => {
  switch (language) {
    case "javascript":
      return javascript();
    case "json":
      return json();
  }
};

export function CodeEditor({
  value,
  onChange,
  language = "javascript",
  readonly = false,
  className,
  height = "400px",
  fontSize = 12,
}: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    const extensions = [
      lineNumbers(),
      EditorView.lineWrapping,
      keymap.of(defaultKeymap),
      getLanguageExtension(language),
      EditorView.editable.of(!readonly),
      EditorView.theme({
        "&": {
          fontSize: `${fontSize}px`,
          height: "100%",
        },
        ".cm-content": {
          fontFamily: "monospace",
          padding: "4px 0",
        },
        ".cm-gutters": {
          minWidth: "20px",
          fontSize: `${fontSize}px`,
        },
        ".cm-scroller": {
          overflow: "auto",
          scrollbarWidth: "thin",
        },
      }),
    ];

    if (onChange && !readonly) {
      extensions.push(
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString());
          }
        })
      );
    }

    const state = EditorState.create({
      doc: value,
      extensions,
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [language, readonly, fontSize, onChange]);

  // Update content when value prop changes externally
  useEffect(() => {
    if (viewRef.current) {
      const currentValue = viewRef.current.state.doc.toString();
      if (currentValue !== value) {
        viewRef.current.dispatch({
          changes: {
            from: 0,
            to: currentValue.length,
            insert: value,
          },
        });
      }
    }
  }, [value]);

  return (
    <div
      ref={editorRef}
      className={cn("border border-gray-300 rounded overflow-hidden", className)}
      style={{ height }}
    />
  );
}
