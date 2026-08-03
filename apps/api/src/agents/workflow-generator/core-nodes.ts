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
  "ai-text",
  "ai-image",
  "ai-transcribe",
];
