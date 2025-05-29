import { useMemo } from "react";

export interface UseSearchOptions<T> {
  items: T[];
  searchQuery: string;
  searchFields: (item: T) => string[];
}

export function useSearch<T>({
  items,
  searchQuery,
  searchFields,
}: UseSearchOptions<T>) {
  return useMemo(() => {
    if (!searchQuery.trim()) {
      return items;
    }

    const query = searchQuery.toLowerCase().trim();

    // Split by spaces and dashes to create search terms
    const searchTerms = query
      .split(/[\s-]+/)
      .filter((term) => term.length > 0)
      .map((term) => term.toLowerCase());

    if (searchTerms.length === 0) {
      return items;
    }

    return items.filter((item) => {
      // Get searchable fields for this item
      const searchableFields = searchFields(item).map((field) =>
        field.toLowerCase()
      );

      const searchableText = searchableFields.join(" ");

      // Create normalized versions (without spaces, dashes, underscores) for better matching
      const normalizedFields = searchableFields.map((field) =>
        field.replace(/[\s-_]/g, "").toLowerCase()
      );
      const normalizedSearchableText = normalizedFields.join(" ");

      // Check if all search terms are found (AND logic for better precision)
      return searchTerms.every((term) => {
        const normalizedTerm = term.replace(/[\s-_]/g, "").toLowerCase();

        // Check direct substring match in any field
        if (searchableText.includes(term)) {
          return true;
        }

        // Check normalized match (handles "tostring" matching "To String")
        if (normalizedSearchableText.includes(normalizedTerm)) {
          return true;
        }

        // Check if term matches word boundaries (more precise matching)
        const wordBoundaryRegex = new RegExp(
          `\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
          "i"
        );
        if (searchableFields.some((field) => wordBoundaryRegex.test(field))) {
          return true;
        }

        // Check normalized word boundaries for individual fields
        const normalizedWordBoundaryRegex = new RegExp(
          `\\b${normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
          "i"
        );
        return normalizedFields.some((field) =>
          normalizedWordBoundaryRegex.test(field)
        );
      });
    });
  }, [items, searchQuery, searchFields]);
}
