import type { NodeType } from "@dafthunk/types";

/**
 * Keyword retrieval over the node catalog, IDF-weighted.
 *
 * No embeddings: there is no vector store in the stack, the corpus is a few
 * hundred short documents, and the discriminating signal is almost entirely in
 * the type id, name and tags. IDF is what makes it work — tags like `Geo` and
 * `Social` cover a fifth of the catalog each and would otherwise drown out the
 * handful of nodes that actually match a query.
 */

const STOPWORDS: ReadonlySet<string> = new Set([
  "a",
  "an",
  "and",
  "the",
  "to",
  "of",
  "in",
  "on",
  "for",
  "with",
  "from",
  "by",
  "at",
  "as",
  "is",
  "are",
  "be",
  "it",
  "its",
  "that",
  "this",
  "then",
  "when",
  "if",
  "into",
  "out",
  "up",
  "my",
  "me",
  "i",
  "we",
  "our",
  "you",
  "your",
  "all",
  "any",
  "each",
  "every",
  "new",
  "get",
  "make",
  "want",
  "need",
  "please",
  "should",
  "would",
  "can",
  "will",
  "do",
  "does",
  "using",
  "use",
  "workflow",
  "node",
  "nodes",
  "step",
  "steps",
  "automatically",
  "automate",
]);

/** Lowercase, split on non-alphanumerics, drop stopwords, crudely singularize. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .map((t) => (t.length > 3 && t.endsWith("s") ? t.slice(0, -1) : t));
}

/**
 * Field weights. The type id and name are the strongest signal because they are
 * short and deliberate; descriptions are prose and match too easily.
 */
const WEIGHT_TYPE = 5;
const WEIGHT_NAME = 5;
const WEIGHT_TAG = 5;
const WEIGHT_PORT = 2;
const WEIGHT_DESCRIPTION = 1;

/** Highest field weight each token appears under, for one node type. */
function weightedTokens(nodeType: NodeType): Map<string, number> {
  const weights = new Map<string, number>();

  const add = (text: string, weight: number) => {
    for (const token of tokenize(text)) {
      const current = weights.get(token) ?? 0;
      if (weight > current) weights.set(token, weight);
    }
  };

  add(nodeType.type.split("-").join(" "), WEIGHT_TYPE);
  add(nodeType.name, WEIGHT_NAME);
  for (const tag of nodeType.tags) add(tag, WEIGHT_TAG);
  for (const port of [...nodeType.inputs, ...nodeType.outputs]) {
    add(port.name.split("_").join(" "), WEIGHT_PORT);
  }
  if (nodeType.description) add(nodeType.description, WEIGHT_DESCRIPTION);

  return weights;
}

export interface ScoredNodeType {
  nodeType: NodeType;
  score: number;
}

/**
 * Ranks node types against a natural-language query, most relevant first.
 * Types scoring zero are omitted.
 */
export function scoreNodeTypes(
  query: string,
  candidates: NodeType[]
): ScoredNodeType[] {
  const documents = candidates.map((nodeType) => ({
    nodeType,
    weights: weightedTokens(nodeType),
  }));

  const documentFrequency = new Map<string, number>();
  for (const document of documents) {
    for (const token of document.weights.keys()) {
      documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
    }
  }

  const total = documents.length;
  const queryTokens = new Set(tokenize(query));

  const scored: ScoredNodeType[] = [];
  for (const document of documents) {
    let score = 0;
    for (const token of queryTokens) {
      const weight = document.weights.get(token);
      if (weight === undefined) continue;
      const idf = Math.log(total / (1 + (documentFrequency.get(token) ?? 0)));
      if (idf > 0) score += idf * weight;
    }
    if (score > 0) scored.push({ nodeType: document.nodeType, score });
  }

  return scored.sort((a, b) => b.score - a.score);
}

/**
 * Nearest real type ids to a hallucinated one, for repair hints. Compares on
 * shared tokens, so `summarize-text` suggests `text-summarizer` and friends.
 */
export function findSimilarTypes(
  badType: string,
  candidates: NodeType[],
  limit: number
): string[] {
  const wanted = new Set(tokenize(badType.split("-").join(" ")));
  if (wanted.size === 0) return [];

  return candidates
    .map((nodeType) => {
      const tokens = new Set(tokenize(nodeType.type.split("-").join(" ")));
      let shared = 0;
      for (const token of wanted) if (tokens.has(token)) shared++;
      return { type: nodeType.type, shared };
    })
    .filter((entry) => entry.shared > 0)
    .sort((a, b) => b.shared - a.shared)
    .slice(0, limit)
    .map((entry) => entry.type);
}
