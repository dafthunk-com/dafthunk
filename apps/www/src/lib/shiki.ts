import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

export type SupportedLanguage =
  | "bash"
  | "json"
  | "http"
  | "yaml"
  | "python"
  | "javascript";

const SHIKI_THEME = "github-light";

let highlighterPromise: Promise<HighlighterCore> | null = null;

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      themes: [import("shiki/themes/github-light.mjs")],
      langs: [
        import("shiki/langs/bash.mjs"),
        import("shiki/langs/json.mjs"),
        import("shiki/langs/http.mjs"),
        import("shiki/langs/yaml.mjs"),
        import("shiki/langs/python.mjs"),
        import("shiki/langs/javascript.mjs"),
      ],
      engine: createJavaScriptRegexEngine({ forgiving: true }),
    }).catch((err) => {
      highlighterPromise = null;
      throw err;
    });
  }
  return highlighterPromise;
}

export async function highlight(
  code: string,
  lang: SupportedLanguage
): Promise<string> {
  const hl = await getHighlighter();
  return hl.codeToHtml(code, { lang, theme: SHIKI_THEME });
}
