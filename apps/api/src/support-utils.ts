const SNIPPET_MAX = 200;

export function buildSnippet(text: string | undefined): string {
  if (!text) return "";
  const collapsed = text.replace(/\s+/g, " ").trim();
  return collapsed.length > SNIPPET_MAX
    ? collapsed.slice(0, SNIPPET_MAX - 1) + "…"
    : collapsed;
}

export function stripHtml(html: string | undefined): string | undefined {
  if (!html) return undefined;
  return html.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ");
}
