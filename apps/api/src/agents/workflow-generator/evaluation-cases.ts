/**
 * Requests judged on what they deliver, not on whether they compile.
 *
 * Separate from `BENCHMARK_CASES` on purpose. Those mirror the shipped
 * templates and ask whether a valid graph comes out; these ask whether a person
 * got what they asked for, which is a different question with different cases.
 *
 * A request earns a place here only if it could plausibly build a perfect graph
 * and still hand back the wrong thing. "Summarize a piece of text" does not: on
 * any graph that validates, the summarizer's output is what arrives. The cases
 * below all have a second place for the answer to go missing — a template that
 * can be wired past the model, a source that can come back empty, a length that
 * can hit a ceiling, a shape that can stay JSON.
 *
 * Two further constraints come from the harness rather than from taste. It runs
 * with nothing connected and the image and sandbox wasm stubbed, so every case
 * is text-only and free of OAuth providers. And the sample input is invented by
 * the model unless the sentence carries it, which is why the cases that assert
 * on content paste their own material in — the way people actually do.
 */
export interface EvaluationCase {
  id: string;
  prompt: string;
  /**
   * Whether the person asked for something to read.
   *
   * The single most discriminating property available without a model. A
   * request for a digest that returns `[{"title":…}]` has failed no matter how
   * well-formed the JSON is.
   */
  expectsProse: boolean;
  /**
   * Words the result should plausibly contain, lowercased.
   *
   * Kept deliberately weak — a smoke test for "did it engage with the subject
   * at all", not a content assertion. Anything stricter measures phrasing.
   *
   * Only usable when the prompt pins the material: with a model-invented sample
   * input there is no word that has to appear.
   */
  expectMentions?: string[];
  /**
   * Roughly the longest a reasonable answer could run, in characters.
   *
   * Set several times higher than a good answer on purpose. The failure being
   * caught is not "a paragraph too long", it is a model that fills whatever
   * budget it is handed regardless of what was asked — thousands of characters
   * for a request that said "in two sentences". Every other check here asks
   * whether the text is wrong; this one asks whether there is far too much of
   * it, which is the only part decidable without a model.
   */
  maxChars?: number;
}

export const EVALUATION_CASES: EvaluationCase[] = [
  /**
   * The canary.
   *
   * One hop, pinned input, pinned expectation — it exercises the model path and
   * the delivery path and nothing else. It is here so that a suite gone red can
   * be read: if this fails too, the AI binding or the harness is broken and the
   * other results say nothing about the generator.
   */
  {
    id: "translate",
    prompt:
      'Translate "Where is the train station?" from English into French and show me the result',
    expectsProse: true,
    expectMentions: ["gare"],
    maxChars: 400,
  },

  /**
   * The one that shipped broken, kept because it did.
   *
   * Delivered the prompt template, truncated, as a JSON array, with the
   * summaries never written. It is also the only case whose source is the live
   * internet, and that is deliberate: the failure it reproduces is what the
   * model does when it is handed nothing — the fetch comes back empty and it
   * invents plausible stories rather than reporting that it has no input.
   */
  {
    id: "hn-digest",
    prompt:
      "Every morning read Hacker News, pick the top articles, write a summary of each, and email it to me",
    expectsProse: true,
    /**
     * No bound, deliberately.
     *
     * 6000 was set here assuming five stories and failed two samples that
     * delivered a genuine ten-story digest at 7,444 and 7,983 characters —
     * links, point counts and real summaries. "Pick the top articles" names no
     * count, so any ceiling encodes an assumption the request never made, and
     * the check starts measuring how many articles rather than whether the
     * answer fits what was asked.
     */
  },

  /**
   * A prompt that can be wired past the model.
   *
   * The graph anyone would build has a template node assembling instructions
   * from the product details, a model turning those into an announcement, and
   * an output. Skip the middle and every structural check still passes: the
   * template emits a string, the output accepts a string, the run completes,
   * and the reader gets the instructions.
   *
   * This is the hn-digest failure with the network removed, so a red result
   * points at the wiring rather than at an empty fetch.
   */
  {
    id: "launch-blurb",
    prompt:
      "I'm launching Ledgerly, an invoicing app for small businesses with recurring invoices, bank sync and VAT reports. Write me a short launch announcement for the blog and show it to me.",
    expectsProse: true,
    expectMentions: ["ledgerly"],
    maxChars: 2500,
  },

  /**
   * Extraction that has to come back as something to read.
   *
   * "Pull out the action items" is the request most likely to terminate in
   * `output-json`: the intermediate really is a list of records, and handing
   * that list over is one edge shorter than writing it out. The person asked
   * for their action items, not for an array.
   */
  {
    id: "meeting-actions",
    prompt:
      "Here are my notes from this morning's standup — pull out the action items and who owns each one, and show me the list. Notes: Bertil to fix the flaky migration test before Friday. Anna is chasing the Cloudflare invoice. We agreed to postpone the redesign until September.",
    expectsProse: true,
    expectMentions: ["anna", "invoice"],
    maxChars: 1500,
  },

  /**
   * A revision step, which is where models start narrating.
   *
   * Asking for a second pass over the first pass gives the second model call a
   * critique to make, and the critique is what gets delivered: "the original
   * response already meets the requirement", "here is the revised version".
   * Every marker in `META_MARKERS` came from output shaped like this.
   */
  {
    id: "revise-and-check",
    prompt:
      "Take this sentence and make it shorter and more formal, then check the rewrite still says the same thing and fix it if it doesn't, then show me the final version: We kind of need everyone to get their expenses in before the end of the month or finance will be on our case again.",
    expectsProse: true,
    maxChars: 600,
  },

  /**
   * Enough output to hit a ceiling.
   *
   * Truncation is invisible to every structural check — a cut-off article is a
   * valid string on a valid edge — and it is the failure a length request
   * produces most often. Nothing here asserts the word count; the point is to
   * ask for enough text that a token limit has a chance to bite.
   */
  {
    id: "long-post",
    prompt:
      "Write me a 700-word blog post about why small teams should automate their invoicing, covering the time it saves, the mistakes it prevents and how to start, and show it to me",
    expectsProse: true,
    maxChars: 9000,
  },

  /**
   * Data in, prose out.
   *
   * The reverse of `meeting-actions`: the input is genuinely tabular and the
   * answer genuinely is not. A graph that parses the CSV and delivers the rows
   * has done the mechanical half and stopped, and the reader is left doing the
   * part they asked for.
   */
  {
    id: "sales-csv",
    prompt:
      "Here's my monthly sales: January,4200\nFebruary,3900\nMarch,5100\nApril,4800\nMay,6300\nJune,5900\nTell me in two sentences which month was best and how the trend looks.",
    expectsProse: true,
    expectMentions: ["may"],
    maxChars: 600,
  },
];
