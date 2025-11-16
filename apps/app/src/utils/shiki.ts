import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

let highlighter: Awaited<ReturnType<typeof createHighlighterCore>>;

async function initHighlighter() {
  if (!highlighter) {
    highlighter = await createHighlighterCore({
      themes: [
        import("@shikijs/themes/github-light"),
        import("@shikijs/themes/github-dark"),
      ],
      langs: [
        import("@shikijs/langs/http"),
        import("@shikijs/langs/json"),
        import("@shikijs/langs/bash"),
        import("@shikijs/langs/yaml"),
        import("@shikijs/langs/python"),
        import("@shikijs/langs/javascript"),
      ],
      engine: createJavaScriptRegexEngine({
        forgiving: true,
      }),
    });
  }
  return highlighter;
}

export async function shikiHighlightCode(code: string, lang: string) {
  const highlighter = await initHighlighter();
  return highlighter.codeToHtml(code, {
    lang,
    themes: {
      light: "github-light",
      dark: "github-dark",
    },
  });
}
