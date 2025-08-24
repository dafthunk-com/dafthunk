import { useMemo } from "react";

export interface TagCount {
  tag: string;
  count: number;
}

export interface ItemWithTags {
  tags: string[];
}

export interface ItemWithCategory {
  category: string;
}

export function useTagCounts<
  T extends ItemWithTags & { functionCalling?: boolean },
>(items: T[]): TagCount[] {
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

    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([tag, count]) => ({ tag, count }));
  }, [items]);
}

export function useCategoryCounts<T extends ItemWithCategory>(
  items: T[]
): TagCount[] {
  return useMemo(() => {
    const counts: Record<string, number> = {};

    items.forEach((item) => {
      const category = item.category;
      if (category) {
        counts[category] = (counts[category] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([tag, count]) => ({ tag, count }));
  }, [items]);
}
