/**
 * Text normalization utilities for search and matching
 */

/**
 * Common English stop words that don't carry significant meaning
 */
const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "for",
  "from",
  "has",
  "have",
  "he",
  "in",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "that",
  "the",
  "to",
  "was",
  "were",
  "will",
  "with",
  "use",
  "using",
  "used",
  "user",
  "can",
  "this",
  "than",
  "then",
  "these",
  "those",
]);

/**
 * Simple stemming rules for common English suffixes
 * Maps suffix to replacement
 */
const STEMMING_RULES: Array<[RegExp, string]> = [
  [/ies$/, "y"], // studies → study
  [/ied$/, "y"], // studied → study
  [/sses$/, "ss"], // processes → process
  [/([^s])s$/, "$1"], // cats → cat, but not pass
  [/ing$/, ""], // running → run
  [/ed$/, ""], // walked → walk
  [/tion$/, "t"], // creation → creat
  [/sion$/, "s"], // expansion → expans
  [/ment$/, ""], // development → develop
  [/ness$/, ""], // happiness → happi
  [/ful$/, ""], // beautiful → beauti
  [/ly$/, ""], // quickly → quick
  [/er$/, ""], // faster → fast
  [/est$/, ""], // fastest → fast
];

/**
 * Common lemmatization mappings for irregular words
 */
const LEMMA_MAP: Record<string, string> = {
  better: "good",
  best: "good",
  running: "run",
  ran: "run",
  runs: "run",
  was: "be",
  were: "be",
  been: "be",
  being: "be",
  am: "be",
  are: "be",
  is: "be",
  has: "have",
  had: "have",
  having: "have",
  does: "do",
  did: "do",
  doing: "do",
  done: "do",
  goes: "go",
  went: "go",
  going: "go",
  gone: "go",
  getting: "get",
  got: "get",
  gotten: "get",
  making: "make",
  made: "make",
  taking: "take",
  took: "take",
  taken: "take",
};

/**
 * Remove punctuation from text
 */
export function removePunctuation(text: string): string {
  return text.replace(/[^\w\s]/g, " ");
}

/**
 * Normalize whitespace (collapse multiple spaces, trim)
 */
export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Remove stop words from an array of tokens
 */
export function removeStopWords(tokens: string[]): string[] {
  return tokens.filter((token) => !STOP_WORDS.has(token.toLowerCase()));
}

/**
 * Simple stemmer - reduces words to their root form
 */
export function stem(word: string): string {
  const lower = word.toLowerCase();

  // Don't stem very short words
  if (lower.length <= 3) return lower;

  // Try each stemming rule
  for (const [pattern, replacement] of STEMMING_RULES) {
    if (pattern.test(lower)) {
      return lower.replace(pattern, replacement);
    }
  }

  return lower;
}

/**
 * Lemmatize - convert to base dictionary form
 */
export function lemmatize(word: string): string {
  const lower = word.toLowerCase();
  return LEMMA_MAP[lower] || stem(lower);
}

/**
 * Tokenize text into words
 */
export function tokenize(text: string): string[] {
  // Remove punctuation, normalize whitespace, lowercase, split
  const cleaned = normalizeWhitespace(removePunctuation(text.toLowerCase()));
  return cleaned.split(/\s+/).filter((token) => token.length > 0);
}

/**
 * Full text normalization pipeline
 * Returns normalized tokens ready for matching
 */
export interface NormalizeOptions {
  removeStopWords?: boolean;
  useStemming?: boolean;
  useLemmatization?: boolean;
  minTokenLength?: number;
}

export function normalizeText(
  text: string,
  options: NormalizeOptions = {}
): string[] {
  const {
    removeStopWords: shouldRemoveStopWords = true,
    useStemming = false,
    useLemmatization = true,
    minTokenLength = 2,
  } = options;

  // Tokenize
  let tokens = tokenize(text);

  // Remove stop words
  if (shouldRemoveStopWords) {
    tokens = removeStopWords(tokens);
  }

  // Filter by minimum length
  tokens = tokens.filter((token) => token.length > minTokenLength);

  // Apply stemming or lemmatization
  if (useLemmatization) {
    tokens = tokens.map(lemmatize);
  } else if (useStemming) {
    tokens = tokens.map(stem);
  }

  return tokens;
}

/**
 * Create a searchable index from text
 * Returns a Set of normalized tokens for fast lookup
 */
export function createSearchIndex(
  text: string,
  options?: NormalizeOptions
): Set<string> {
  return new Set(normalizeText(text, options));
}

/**
 * Check if any tokens from query match any tokens in target
 */
export function matchesQuery(
  targetTokens: Set<string>,
  queryTokens: string[]
): boolean {
  return queryTokens.some((token) => targetTokens.has(token));
}
