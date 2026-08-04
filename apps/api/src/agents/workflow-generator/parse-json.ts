/**
 * Pulls the first JSON object out of a model response.
 *
 * Constrained decoding does most of this work now — the Anthropic and Google
 * paths both bind the response to a schema — but not every provider can, and a
 * fence or a sentence of preamble is always possible on the ones that cannot.
 *
 * The one thing it must never do is disguise a truncated answer as a malformed
 * one. Those have opposite fixes, and the reader of the error can only tell
 * them apart if this says which happened.
 */
export function parseJsonObject(content: string): Record<string, unknown> {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : content).trim();

  const start = candidate.indexOf("{");
  if (start === -1) {
    throw new Error("Model response contained no JSON object");
  }

  // Whole document first. When decoding was constrained — or the model simply
  // behaved — this is the answer, and it avoids the slice below entirely.
  const attempts = [candidate.slice(start)];

  // Fallback for a trailing sentence after the object. Deliberately second:
  // when a response is *truncated*, the last `}` closes some nested object
  // mid-array, and slicing there produces a document that is malformed rather
  // than obviously incomplete — which is how a cut-off answer used to surface
  // as a syntax error at a position nobody could account for.
  const end = candidate.lastIndexOf("}");
  if (end > start) attempts.push(candidate.slice(start, end + 1));

  for (const attempt of attempts) {
    try {
      const parsed = JSON.parse(attempt);
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // Try the next shape.
    }
  }

  // Balanced braces mean it is genuinely malformed; unbalanced means it stopped
  // early. Saying which decides whether to look at the prompt or the budget.
  const opens = (candidate.match(/{/g) ?? []).length;
  const closes = (candidate.match(/}/g) ?? []).length;
  throw new Error(
    opens > closes
      ? "Model response ended before the JSON object was closed (it was cut off, not malformed)."
      : "Model response was not valid JSON."
  );
}
