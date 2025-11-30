import { useMemo } from "react";

export interface TagCount {
  tag: string;
  count: number;
}

export interface ItemWithTags {
  tags: string[];
}

export function useTagCounts<
  T extends ItemWithTags & { functionCalling?: boolean },
>(items: T[], topN?: number): TagCount[] {
  return useMemo(() => {
    const counts: Record<string, number> = {};

    items.forEach((item) => {
      // Count each tag, not just the first one
      item.tags.forEach((tag) => {
        if (tag) {
          counts[tag] = (counts[tag] || 0) + 1;
        }
      });

      // Add synthetic tag for function calling support
      if ((item as any).functionCalling) {
        counts["Tools"] = (counts["Tools"] || 0) + 1;
      }
    });

    const sorted = Object.entries(counts)
      .sort(([a, countA], [b, countB]) => {
        // Sort by count descending, then alphabetically
        if (countB !== countA) return countB - countA;
        return a.localeCompare(b);
      })
      .map(([tag, count]) => ({ tag, count }));

    // If topN is specified, return only top N tags
    return topN !== undefined ? sorted.slice(0, topN) : sorted;
  }, [items, topN]);
}
