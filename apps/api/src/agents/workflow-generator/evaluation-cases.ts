/**
 * Requests judged on what they deliver, not on whether they compile.
 *
 * Separate from `BENCHMARK_CASES` on purpose. Those mirror the shipped
 * templates and ask whether a valid graph comes out; these ask whether a person
 * got what they asked for, which is a different question with different cases.
 * A request only belongs here if there is something concrete to say about the
 * output — "it should read as prose", "it should not be a JSON dump".
 *
 * The first case is a real failure, kept as a case because it shipped: it
 * validated, ran to completion, and emailed somebody their own prompt.
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
   */
  expectMentions?: string[];
}

export const EVALUATION_CASES: EvaluationCase[] = [
  {
    // Shipped broken on 2026-08-05: delivered the prompt template, truncated,
    // as a JSON array, with the summaries never written.
    id: "hn-digest",
    prompt:
      "Every morning read Hacker News, pick the top articles, write a summary of each, and email it to me",
    expectsProse: true,
  },
  {
    id: "text-summary",
    prompt:
      "Take a long piece of text, shorten it to three bullet points, and show me the result",
    expectsProse: true,
  },
  {
    id: "translate",
    prompt:
      "Translate some text from English into French and show me the result",
    expectsProse: true,
  },
  {
    id: "sentiment",
    prompt: "Tell me whether a piece of text is positive or negative",
    expectsProse: true,
  },
];
