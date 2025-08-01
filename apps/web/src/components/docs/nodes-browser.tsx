import { Grid, List, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TagFilterButtons } from "@/components/ui/tag-filter-buttons";
import { useSearch } from "@/hooks/use-search";
import { useTagCounts } from "@/hooks/use-tag-counts";
import { useNodeTypes } from "@/services/type-service";

import { NodeCard } from "./node-card";

type ViewMode = "card" | "list";

export function NodesBrowser() {
  const { nodeTypes, isNodeTypesLoading, nodeTypesError } = useNodeTypes();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("card");

  // Use the search hook with intelligent search
  const searchResults = useSearch({
    items: nodeTypes,
    searchQuery,
    searchFields: (nodeType) => [
      nodeType.name,
      nodeType.description || "",
      ...nodeType.tags,
      nodeType.type,
    ],
  });

  // Get tag counts (using all tags, not just the first one)
  const tagCounts = useTagCounts(nodeTypes);

  // Filter nodes based on search results and selected tag
  const filteredNodes = useMemo(() => {
    let filtered = searchResults;

    // Filter by tag (check if any tag matches)
    if (selectedTag) {
      filtered = filtered.filter((nodeType) =>
        nodeType.tags.includes(selectedTag)
      );
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [searchResults, selectedTag]);

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
          selectedTag={selectedTag}
          onTagChange={setSelectedTag}
          totalCount={nodeTypes.length}
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
                  setSelectedTag(null);
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
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
