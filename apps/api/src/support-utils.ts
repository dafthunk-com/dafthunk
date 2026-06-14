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

// Subject prefixes added by mail clients on reply/forward. Stripped before
// using subject as a thread-matching fallback so "Re: hello" matches "hello".
const SUBJECT_PREFIX_RE = /^(re|fwd?|aw|sv|tr)\s*(\[\d+\])?\s*:\s*/i;

/** Strip leading Re:/Fwd: prefixes (recursively) and collapse whitespace. */
export function normalizeSubject(subject: string): string {
  let s = subject.trim();
  while (SUBJECT_PREFIX_RE.test(s)) {
    s = s.replace(SUBJECT_PREFIX_RE, "");
  }
  return s.replace(/\s+/g, " ").trim();
}
