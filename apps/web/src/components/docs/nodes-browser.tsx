import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { useNodeTypes } from "@/services/type-service";

import { NodeCard } from "./node-card";
import { NodesStats } from "./nodes-stats";

export function NodesBrowser() {
  const { nodeTypes, isNodeTypesLoading, nodeTypesError } = useNodeTypes();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Get unique categories and their counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    nodeTypes.forEach((nodeType) => {
      const category = nodeType.category;
      counts[category] = (counts[category] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, count]) => ({ category, count }));
  }, [nodeTypes]);

  // Filter nodes based on search query and selected category
  const filteredNodes = useMemo(() => {
    let filtered = nodeTypes;

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(
        (nodeType) => nodeType.category === selectedCategory
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (nodeType) =>
          nodeType.name.toLowerCase().includes(query) ||
          nodeType.description?.toLowerCase().includes(query) ||
          nodeType.category.toLowerCase().includes(query) ||
          nodeType.type.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [nodeTypes, searchQuery, selectedCategory]);

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
      {/* Stats Section */}
      {!isNodeTypesLoading && !nodeTypesError && (
        <NodesStats nodeTypes={nodeTypes} />
      )}

      {/* Search and Filter Controls */}
      <div className="space-y-4">
        <SearchInput
          placeholder="Search nodes by name, description, or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-lg"
        />

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            All ({nodeTypes.length})
          </Button>
          {categoryCounts.map(({ category, count }) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() =>
                setSelectedCategory(
                  selectedCategory === category ? null : category
                )
              }
            >
              {category} ({count})
            </Button>
          ))}
        </div>
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
                  setSelectedCategory(null);
                }}
              >
                Clear filters
              </Button>
            </div>
          )}

          {/* Node Grid */}
          {filteredNodes.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
              {filteredNodes.map((nodeType) => (
                <NodeCard key={nodeType.id} nodeType={nodeType} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
