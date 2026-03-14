import { useMemo, useState } from "react";

import { useTagCounts } from "@/hooks/use-tag-counts";
import { normalizeText } from "@/utils/text-normalization";

import type { NodeType } from "./workflow-types";

interface TemplateSearchResult {
  sorted: NodeType[];
  scores: { template: NodeType; score: number; matchesSearch: boolean }[];
}

/**
 * Scores and filters templates based on search term and workflow context.
 * Shared between NodeSelector and ToolSelector.
 */
export function useTemplateSearch(
  templates: NodeType[],
  searchTerm: string,
  workflowName?: string,
  workflowDescription?: string
): TemplateSearchResult {
  return useMemo(() => {
    const workflowKeywords = normalizeText(
      [workflowName, workflowDescription].filter(Boolean).join(" "),
      { removeStopWords: true, useLemmatization: true, minTokenLength: 2 }
    );

    const searchKeywords = normalizeText(searchTerm, {
      removeStopWords: true,
      useLemmatization: true,
      minTokenLength: 2,
    });

    const rawSearchTerm = searchTerm.toLowerCase().trim();

    const containsPartialMatch = (text: string, term: string): boolean => {
      if (!term) return false;
      return text.toLowerCase().includes(term);
    };

    const scored = templates
      .map((template) => {
        let score = 0;

        const nameTokens = new Set(
          normalizeText(template.name, {
            removeStopWords: false,
            useLemmatization: true,
            minTokenLength: 2,
          })
        );
        const descTokens = new Set(
          normalizeText(template.description ?? "", {
            removeStopWords: true,
            useLemmatization: true,
            minTokenLength: 2,
          })
        );
        const tagTokens = new Set(
          template.tags.flatMap((tag) =>
            normalizeText(tag, {
              removeStopWords: false,
              useLemmatization: true,
              minTokenLength: 2,
            })
          )
        );

        workflowKeywords.forEach((keyword) => {
          if (nameTokens.has(keyword)) score += 10;
          if (descTokens.has(keyword)) score += 5;
          if (tagTokens.has(keyword)) score += 7;
        });

        searchKeywords.forEach((keyword) => {
          if (nameTokens.has(keyword)) score += 20;
          if (descTokens.has(keyword)) score += 10;
          if (tagTokens.has(keyword)) score += 15;
        });

        if (rawSearchTerm) {
          if (containsPartialMatch(template.name, rawSearchTerm)) score += 15;
          if (containsPartialMatch(template.description ?? "", rawSearchTerm))
            score += 8;
          template.tags.forEach((tag) => {
            if (containsPartialMatch(tag, rawSearchTerm)) score += 12;
          });
        }

        const matchesSearch =
          !rawSearchTerm ||
          containsPartialMatch(template.name, rawSearchTerm) ||
          containsPartialMatch(template.description ?? "", rawSearchTerm) ||
          template.tags.some((tag) =>
            containsPartialMatch(tag, rawSearchTerm)
          ) ||
          searchKeywords.some(
            (keyword) =>
              nameTokens.has(keyword) ||
              descTokens.has(keyword) ||
              tagTokens.has(keyword)
          );

        return { template, score, matchesSearch };
      })
      .filter((s) => s.matchesSearch)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.template.name.localeCompare(b.template.name);
      });

    return {
      sorted: scored.map((s) => s.template),
      scores: scored,
    };
  }, [templates, workflowName, workflowDescription, searchTerm]);
}

/**
 * Tag filtering logic shared between NodeSelector and ToolSelector.
 */
export function useTagFiltering(
  searchResults: NodeType[],
  specialTagFilter?: (template: NodeType, tag: string) => boolean
) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const filteredTemplates = searchResults.filter((template) => {
    if (selectedTags.length === 0) return true;
    return selectedTags.every((selectedTag) => {
      if (specialTagFilter) return specialTagFilter(template, selectedTag);
      return template.tags.includes(selectedTag);
    });
  });

  const overallTagCounts = useTagCounts(searchResults);
  const filteredTagCounts = useTagCounts(filteredTemplates);

  const tagCounts = filteredTagCounts.slice(0, 20).map(({ tag }) => {
    const overallCount =
      overallTagCounts.find((tc) => tc.tag === tag)?.count ?? 0;
    return { tag, count: overallCount };
  });

  const selectedTagCounts = overallTagCounts
    .filter((tc) => selectedTags.includes(tc.tag))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.tag.localeCompare(b.tag);
    });

  const handleTagChange = (tag: string | null) => {
    if (tag === null) {
      setSelectedTags([]);
    } else if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  return {
    selectedTags,
    filteredTemplates,
    tagCounts,
    selectedTagCounts,
    handleTagChange,
  };
}
