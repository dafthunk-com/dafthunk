import { useMemo } from "react";

export interface UseSearchOptions<T> {
  items: T[];
  searchQuery: string;
  searchFields: (item: T) => string[];
}

// Scoring constants used to rank matches
const SCORE = {
  normalizedExact: 1000,
  exact: 900,
  startsWith: 700,
  wordBoundary: 500,
  contains: 300,
  normalizedContains: 100,
  phraseExact: 2500,
  phraseNormalized: 2200,
  phraseStartsWith: 300,
} as const;

interface FieldData {
  lowerFields: string[];
  normalizedFields: string[];
  weights: number[];
  searchableText: string;
  normalizedText: string;
}

export function useSearch<T>({
  items,
  searchQuery,
  searchFields,
}: UseSearchOptions<T>) {
  return useMemo(() => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return items;

    const query = trimmedQuery.toLowerCase();

    // Split by spaces and dashes to create search terms
    const searchTerms = query
      .split(/[\s-]+/)
      .filter((term) => term.length > 0)
      .map((term) => term.toLowerCase());

    if (searchTerms.length === 0) return items;

    // Helpers
    const escapeRegex = (value: string) =>
      value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const normalizeCompact = (value: string) => value.replace(/[\s-_]/g, "");

    const buildFieldData = (fields: string[]): FieldData => {
      const lowerFields = fields.map((f) => f.toLowerCase());
      const normalizedFields = lowerFields.map((f) => normalizeCompact(f));
      const weights = fields.map((_, index) => fields.length - index);
      return {
        lowerFields,
        normalizedFields,
        weights,
        searchableText: lowerFields.join(" "),
        normalizedText: normalizedFields.join(" "),
      };
    };

    const normalizedQuery = normalizeCompact(query);

    const matchesAllTerms = (data: FieldData): boolean => {
      return searchTerms.every((term) => {
        const normalizedTerm = normalizeCompact(term);
        if (data.searchableText.includes(term)) return true;
        if (data.normalizedText.includes(normalizedTerm)) return true;

        const wordBoundaryRegex = new RegExp(`\\b${escapeRegex(term)}`, "i");
        if (data.lowerFields.some((field) => wordBoundaryRegex.test(field))) {
          return true;
        }

        const normWordBoundaryRegex = new RegExp(
          `\\b${escapeRegex(normalizedTerm)}`,
          "i"
        );
        return data.normalizedFields.some((field) =>
          normWordBoundaryRegex.test(field)
        );
      });
    };

    const computeItemScore = (data: FieldData): number => {
      let totalScore = 0;

      for (const term of searchTerms) {
        const normalizedTerm = normalizeCompact(term);
        for (let i = 0; i < data.lowerFields.length; i++) {
          const field = data.lowerFields[i];
          const normField = data.normalizedFields[i];
          const weight = data.weights[i];

          if (normField === normalizedTerm) {
            totalScore += SCORE.normalizedExact * weight;
            continue;
          }
          if (field === term) {
            totalScore += SCORE.exact * weight;
            continue;
          }
          if (field.startsWith(term)) {
            totalScore += SCORE.startsWith * weight;
            continue;
          }
          const wordBoundaryRegex = new RegExp(`\\b${escapeRegex(term)}`, "i");
          if (wordBoundaryRegex.test(field)) {
            totalScore += SCORE.wordBoundary * weight;
            continue;
          }
          if (field.includes(term)) {
            totalScore += SCORE.contains * weight;
            continue;
          }
          if (normField.includes(normalizedTerm)) {
            totalScore += SCORE.normalizedContains * weight;
            continue;
          }
        }
      }

      for (let i = 0; i < data.lowerFields.length; i++) {
        const field = data.lowerFields[i];
        const normField = data.normalizedFields[i];
        const weight = data.weights[i];

        if (field.includes(query)) {
          totalScore += SCORE.phraseExact * weight;
        } else if (normField.includes(normalizedQuery)) {
          totalScore += SCORE.phraseNormalized * weight;
        }

        if (field.startsWith(query)) {
          totalScore += SCORE.phraseStartsWith * weight;
        }
      }

      return totalScore;
    };

    // First, determine which items match (AND across terms), then rank them
    const scoredMatches = items
      .map((item, index) => {
        const fields = searchFields(item);
        const fieldData = buildFieldData(fields);
        const score = matchesAllTerms(fieldData)
          ? computeItemScore(fieldData)
          : 0;
        return { item, score, index };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.index - b.index;
      });

    return scoredMatches.map(({ item }) => item);
  }, [items, searchQuery, searchFields]);
}
