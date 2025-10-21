import Grid from "lucide-react/icons/grid";
import List from "lucide-react/icons/list";
import Loader2 from "lucide-react/icons/loader-2";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TagFilterButtons } from "@/components/ui/tag-filter-buttons";
import { useTagCounts } from "@/hooks/use-tag-counts";
import { useNodeTypes } from "@/services/type-service";
import { normalizeText } from "@/utils/text-normalization";

import { NodeCard } from "./node-card";

type ViewMode = "card" | "list";

// Helper function to highlight matching text
function highlightMatch(text: string, searchTerm: string) {
  if (!searchTerm.trim()) return text;

  // Split search term into individual words and escape special regex characters
  const words = searchTerm
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .filter((word) => word.length > 0);

  if (words.length === 0) return text;

  // Create a regex that matches any of the words
  const regex = new RegExp(`(${words.join("|")})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, index) => {
    // Check if this part matches any of the search words
    if (words.some((word) => new RegExp(`^${word}$`, "i").test(part))) {
      return (
        <mark
          key={index}
          className="bg-yellow-200 dark:bg-yellow-900 font-semibold"
        >
          {part}
        </mark>
      );
    }
    return part;
  });
}

export function NodesBrowser() {
  const { nodeTypes, isNodeTypesLoading, nodeTypesError } = useNodeTypes();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("card");

  // Combined scoring using substring matching (not fuzzy)
  const scoredAndFilteredNodes = useMemo(() => {
    // Normalize search query (for scoring only - no filtering)
    const searchKeywords = normalizeText(searchQuery, {
      removeStopWords: true,
      useLemmatization: true,
      minTokenLength: 2,
    });

    // Also keep original search term for partial matching
    const rawSearchTerm = searchQuery.toLowerCase().trim();

    // Helper function for partial word matching
    const containsPartialMatch = (
      text: string,
      searchTerm: string
    ): boolean => {
      if (!searchTerm) return false;
      return text.toLowerCase().includes(searchTerm);
    };

    // Score each node type
    const scored = nodeTypes
      .map((nodeType) => {
        let score = 0;

        // Normalize node type fields
        const nameTokens = new Set(
          normalizeText(nodeType.name, {
            removeStopWords: false, // Keep all words in name
            useLemmatization: true,
            minTokenLength: 2,
          })
        );
        const descTokens = new Set(
          normalizeText(nodeType.description || "", {
            removeStopWords: true,
            useLemmatization: true,
            minTokenLength: 2,
          })
        );
        const tagTokens = new Set(
          nodeType.tags.flatMap((tag) =>
            normalizeText(tag, {
              removeStopWords: false,
              useLemmatization: true,
              minTokenLength: 2,
            })
          )
        );

        // Score based on search keywords (if present) - exact token match
        searchKeywords.forEach((keyword) => {
          if (nameTokens.has(keyword)) score += 20;
          if (descTokens.has(keyword)) score += 10;
          if (tagTokens.has(keyword)) score += 15;
        });

        // Bonus scoring for partial matches in search term (substring matching)
        if (rawSearchTerm) {
          if (containsPartialMatch(nodeType.name, rawSearchTerm)) score += 15;
          if (containsPartialMatch(nodeType.description || "", rawSearchTerm))
            score += 8;
          nodeType.tags.forEach((tag) => {
            if (containsPartialMatch(tag, rawSearchTerm)) score += 12;
          });
        }

        // Check if matches search filter (partial or exact match)
        const matchesSearch =
          !rawSearchTerm ||
          containsPartialMatch(nodeType.name, rawSearchTerm) ||
          containsPartialMatch(nodeType.description || "", rawSearchTerm) ||
          nodeType.tags.some((tag) =>
            containsPartialMatch(tag, rawSearchTerm)
          ) ||
          searchKeywords.some(
            (keyword) =>
              nameTokens.has(keyword) ||
              descTokens.has(keyword) ||
              tagTokens.has(keyword)
          );

        return { nodeType, score, matchesSearch };
      })
      .filter((s) => s.matchesSearch) // Filter by search query
      .sort((a, b) => {
        // Sort by score (highest first), then alphabetically
        if (b.score !== a.score) return b.score - a.score;
        return a.nodeType.name.localeCompare(b.nodeType.name);
      });

    return {
      sorted: scored.map((s) => s.nodeType),
      scores: scored,
    };
  }, [nodeTypes, searchQuery]);

  // Filter nodes based on selected tags (all must match)
  const filteredNodes = useMemo(() => {
    return scoredAndFilteredNodes.sorted.filter((nodeType) => {
      // If no tags selected, show all
      if (selectedTags.length === 0) return true;

      // Check if all selected tags match
      return selectedTags.every((selectedTag) => {
        if (selectedTag === "Tools") {
          return !!nodeType.functionCalling;
        }
        return nodeType.tags.includes(selectedTag);
      });
    });
  }, [scoredAndFilteredNodes.sorted, selectedTags]);

  // Get overall tag counts (for display)
  const overallTagCounts = useTagCounts(scoredAndFilteredNodes.sorted);

  // Get filtered tag counts (for discrimination/ordering)
  const filteredTagCounts = useTagCounts(filteredNodes);

  // Combine: use filtered counts for ordering, but display overall counts
  // Show top 20 tags by filtered count
  const tagCounts = filteredTagCounts.slice(0, 20).map(({ tag }) => {
    const overallCount =
      overallTagCounts.find((tc) => tc.tag === tag)?.count ?? 0;
    return { tag, count: overallCount };
  });

  // Get overall counts for selected tags (sorted by count desc, then alphabetically)
  const selectedTagCounts = overallTagCounts
    .filter((tc) => selectedTags.includes(tc.tag))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.tag.localeCompare(b.tag);
    });

  // Handle tag change
  const handleTagChange = (tag: string | null) => {
    if (tag === null) {
      setSelectedTags([]);
    } else if (selectedTags.includes(tag)) {
      // Remove tag if already selected
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      // Add tag if not selected
      setSelectedTags([...selectedTags, tag]);
    }
  };

  if (nodeTypesError) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-sm text-destructive">
          Failed to load node types. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex-1 min-w-0">
            <SearchInput
              placeholder="Search nodes by name, description, or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full max-w-lg"
            />
          </div>

          {/* View Mode Toggle */}
          <Tabs
            value={viewMode}
            onValueChange={(value) => setViewMode(value as ViewMode)}
            className="shrink-0"
          >
            <TabsList>
              <TabsTrigger value="card" className="flex items-center gap-2">
                <Grid className="size-4" />
                Cards
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="size-4" />
                List
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Tag Filter */}
        <TagFilterButtons
          categories={tagCounts}
          selectedTags={selectedTags}
          selectedTagCounts={selectedTagCounts}
          onTagChange={handleTagChange}
          totalCount={scoredAndFilteredNodes.sorted.length}
        />
      </div>

      {/* Loading State */}
      {isNodeTypesLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading nodes...</span>
        </div>
      )}

      {/* Results */}
      {!isNodeTypesLoading && (
        <>
          {/* Results Count */}
          <div className="text-sm text-muted-foreground">
            {filteredNodes.length === nodeTypes.length
              ? `Showing all ${nodeTypes.length} nodes`
              : `Showing ${filteredNodes.length} of ${nodeTypes.length} nodes`}
          </div>

          {/* No Results */}
          {filteredNodes.length === 0 && !isNodeTypesLoading && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No nodes found matching your search criteria.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedTags([]);
                }}
              >
                Clear filters
              </Button>
            </div>
          )}

          {/* Node Grid/List */}
          {filteredNodes.length > 0 && (
            <div
              className={
                viewMode === "card"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4"
                  : "space-y-2"
              }
            >
              {filteredNodes.map((nodeType) => (
                <NodeCard
                  key={nodeType.id}
                  nodeType={nodeType}
                  variant={viewMode}
                  searchQuery={searchQuery}
                  highlightMatch={highlightMatch}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
