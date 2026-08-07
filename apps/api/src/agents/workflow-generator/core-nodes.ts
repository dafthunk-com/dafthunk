/**
 * Node types always offered to the model, regardless of keyword score.
 *
 * Retrieval is good at finding the domain-specific node ("parse email") and bad
 * at finding the glue around it, because nobody writes "string template" in a
 * request. Without a guaranteed floor of plumbing and output nodes the model
 * invents types instead, which costs a whole repair round.
 *
 * Entries are filtered through the eligibility rules before use, so a type that
 * is not registered in this environment simply never appears.
 */
export const CORE_NODE_TYPES: readonly string[] = [
  // Inputs
  "text-input",
  "number-input",
  "boolean-input",
  "json-input",
  "image-input",
  // Outputs — every branch must terminate in one of these for the run to show
  // the user anything.
  "output-text",
  "output-json",
  "output-any",
  "output-image",
  "output-audio",
  // Text assembly
  "var-string-template",
  "json-string-template",
  "string-concat",
  "string-includes",
  "string-trim",
  "regex-extract",
  "regex-match",
  "regex-replace",
  "regex-split",
  // Conversion — `to-string` is the bridge out of json/any, which is by far the
  // most common type-mismatch the model needs a way to fix.
  "to-string",
  "to-json",
  // JSON access
  "json-extract-string",
  "json-extract-number",
  "json-extract-object",
  "json-extract-boolean",
  "json-keys",
  // Control flow
  "conditional-fork",
  "conditional-join",
  "switch-fork",
  "switch-join",
  // Network
  "fetch",
  // AI (curated pseudo types, see ai-nodes.ts)
  //
  // `ai-text` used to head this list and is deliberately gone: the agent node
  // below now serves plain generation as well as the tool loop, because an
  // agent with no tools is a text generator. Image and transcription stay,
  // since no Anthropic model replaces them.
  "ai-image",
  "ai-transcribe",
  /**
   * The agent-loop node to reach for by default, on the same reasoning as the
   * pseudo types above: it runs on Workers AI, so a workflow built around it
   * executes on the first attempt in any deployment. The keyed agents stay
   * score-gated — they are worth offering when a request clearly wants one, and
   * not worth spending catalog space on otherwise.
   *
   * Sonnet rather than a Workers AI agent, which is a deliberate departure from
   * the reasoning above and the only entry here that costs real money per run.
   *
   * The Workers AI agents were tried first and both failed on the model rather
   * than the shape. GLM carries a 6–11 second floor on every call and returned
   * 504 on every real one. Qwen replaced it and merely ran out of room instead:
   * a 32,768-token context cannot hold a ten-article digest, so a request for
   * ten delivers fewer. Underneath both sits a failure the evaluation kept
   * re-finding — `finish_reason=length` on four of seven cases at a 1024-token
   * ceiling, meaning these models do not stop when they are done, they stop when
   * the budget does. No ceiling serves both "translate one sentence" and "write
   * 700 words" when the model fills whatever it is given.
   *
   * Sonnet stops on its own, which is the property none of the others have, and
   * carries a 200K context that removes the digest limit outright. Measured:
   * it passed `hn-digest` on both samples of the first N=2 run, a case that had
   * failed every previous run under three different Workers AI models.
   *
   * Two costs come with it, both real. It bills at $3/$15 per M against Workers
   * AI's fractions of a cent, on every generated workflow rather than only on
   * generation. And it needs the AI Gateway configured, so the "runs on the
   * first attempt in any deployment" property the pseudo types were built for
   * no longer holds for text. That property was worth more when the alternative
   * worked; a workflow that runs anywhere and delivers a cut-off answer is not
   * the better trade.
   *
   * Listed because retrieval cannot find it. Nobody writes "agent" in a
   * request; they write "read the top stories and summarize each", and the
   * shape that suits it has to be on the table before the model can choose it.
   */
  "agent-claude-sonnet-4",
];
