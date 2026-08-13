/**
 * Reading a prompt back, so a test can ask what it claims.
 *
 * Test infrastructure, imported only by `prompts.test.ts` and
 * `prompt-facts.test.ts`. It lives beside them rather than under `eval/`
 * because the suites it serves are free, offline and run on every commit —
 * `eval/` is the billed tier.
 *
 * ## Why this exists
 *
 * The prompt is an unversioned public API. Its consumer cannot read our source,
 * cannot be deprecated, and never files a bug report — so nothing catches a
 * sentence that describes the platform as it was eighteen months ago. There is
 * no compiler on that side of the call, which makes deriving every fact from
 * the module that owns it the only honesty mechanism available. These helpers
 * are what turn "derived" from an intention into an assertion.
 *
 * ## How extraction works, and why it is not a parser
 *
 * Recognising node ids inside free English is a losing game: "send-email" and
 * "to-string" are indistinguishable from ordinary hyphenated prose, and the
 * first false positive is what gets the whole suite skipped. So this never
 * parses. It does three narrower things instead:
 *
 * 1. `sections` splits the prompt on its own markdown headings, so a sweep can
 *    skip the catalog — which legitimately names every offered type and would
 *    otherwise swamp every result.
 * 2. A closed sweep asks: does the prose name THIS id? Iterating a known
 *    vocabulary — `prose.includes(`"${id}"`)` — has no false positives by
 *    construction, and is the only way to see a single-word id like `fetch`.
 *    Every platform id in every prompt here is written in double quotes, which
 *    is what makes that exact.
 * 3. `quotedIdentifiers` asks the complement: which identifier-shaped quoted
 *    tokens are there that we do NOT know? Shape does the filtering, and a
 *    token that survives it is either a real platform id or a claim someone
 *    invented.
 */

/** A prompt broken at its own headings. */
export interface PromptSections {
  /** Text before the first heading. */
  preamble: string;
  /** Heading text without the leading "# ", in emitted order. */
  order: string[];
  /** Section body, keyed by heading text. */
  body: Map<string, string>;
  /**
   * Everything that makes a claim: the preamble and every section except the
   * two that legitimately enumerate the platform.
   *
   * The catalog names every offered type by definition, and the worked examples
   * are shipped templates built from whatever they were built from. Sweeping
   * either would report a hundred "unknown" ids and prove nothing.
   */
  prose: string;
}

/** Sections whose content is enumeration rather than assertion. */
const ENUMERATING_SECTIONS: ReadonlySet<string> = new Set([
  "Available node types",
  "Examples of correct output",
]);

export function sections(prompt: string): PromptSections {
  const order: string[] = [];
  const body = new Map<string, string>();

  // Split keeping the headings: odd indices are heading text, even are bodies.
  const parts = prompt.split(/^# (.+)$/m);
  const preamble = parts[0] ?? "";

  for (let index = 1; index < parts.length; index += 2) {
    const heading = parts[index].trim();
    order.push(heading);
    body.set(heading, parts[index + 1] ?? "");
  }

  const claiming = order
    .filter((heading) => !ENUMERATING_SECTIONS.has(heading))
    .map((heading) => body.get(heading) ?? "");

  return {
    preamble,
    order,
    body,
    prose: [preamble, ...claiming].join("\n"),
  };
}

/**
 * Identifier-shaped: lowercase, and carrying at least one hyphen or underscore.
 *
 * The separator requirement is what keeps English out. It also means a
 * single-word id (`fetch`) is invisible here by design — those are reachable
 * only through `mentions`, and a single-word id can only enter a prompt
 * deliberately.
 */
const IDENTIFIER_SHAPE = /^[a-z][a-z0-9]*(?:[-_][a-z0-9]+)+$/;

/** Every distinct quoted token in `prose` shaped like a platform identifier. */
export function quotedIdentifiers(prose: string): string[] {
  const quoted = [...prose.matchAll(/"([^"\n]{2,60})"/g)].map(
    (match) => match[1]
  );
  return [...new Set(quoted.filter((token) => IDENTIFIER_SHAPE.test(token)))];
}

/**
 * Prefix claims — `"ai-*"` and friends.
 *
 * Not identifiers but assertions about a whole class: "the nodes worth reaching
 * for share this prefix". They are the one kind of statement that stays true
 * looking while the class underneath it is replaced wholesale, so they get
 * their own extractor and their own assertion.
 *
 * Returns the prefixes including the trailing hyphen: `"ai-*"` yields `"ai-"`.
 */
export function prefixClaims(prose: string): string[] {
  const claims = [...prose.matchAll(/"([a-z][a-z0-9-]*-)\*"/g)].map(
    (match) => match[1]
  );
  return [...new Set(claims)];
}
