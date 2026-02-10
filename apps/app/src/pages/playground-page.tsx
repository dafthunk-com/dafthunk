import type { NodeType } from "@dafthunk/types";
import { DynamicIcon, iconNames } from "lucide-react/dynamic.mjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";

import { useAuth } from "@/components/auth-context";
import { InsetLayout } from "@/components/layouts/inset-layout";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { TagFilterButtons } from "@/components/ui/tag-filter-buttons";
import { NodeTags } from "@/components/workflow/node-tags";
import { usePageBreadcrumbs } from "@/hooks/use-page";
import { useTagCounts } from "@/hooks/use-tag-counts";
import { useNodeTypes } from "@/services/type-service";

// Tags to exclude from the playground (trigger/display-only nodes)
const EXCLUDED_TAGS = new Set(["input", "output", "trigger"]);

function isExcluded(nodeType: NodeType): boolean {
  return nodeType.tags.some((tag) => EXCLUDED_TAGS.has(tag));
}

export function PlaygroundPage() {
  const { organization } = useAuth();
  const orgHandle = organization?.handle || "";
  const navigate = useNavigate();
  const { nodeTypes, isNodeTypesLoading } = useNodeTypes();
  const { setBreadcrumbs } = usePageBreadcrumbs([]);

  useEffect(() => {
    setBreadcrumbs([{ label: "Playground" }]);
  }, [setBreadcrumbs]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter to only executable nodes (exclude input/output/trigger)
  const executableNodeTypes = useMemo(
    () => nodeTypes.filter((nt) => !isExcluded(nt)),
    [nodeTypes]
  );

  // Filter by search term
  const searchFilteredNodeTypes = useMemo(() => {
    const rawSearchTerm = searchTerm.toLowerCase().trim();
    if (!rawSearchTerm) return executableNodeTypes;
    return executableNodeTypes.filter(
      (nt) =>
        nt.name.toLowerCase().includes(rawSearchTerm) ||
        nt.type.toLowerCase().includes(rawSearchTerm) ||
        nt.description?.toLowerCase().includes(rawSearchTerm) ||
        nt.tags.some((tag) => tag.toLowerCase().includes(rawSearchTerm))
    );
  }, [executableNodeTypes, searchTerm]);

  // Filter by selected tags (all must match)
  const filteredNodeTypes = useMemo(() => {
    if (selectedTags.length === 0) return searchFilteredNodeTypes;
    return searchFilteredNodeTypes.filter((nt) =>
      selectedTags.every((tag) => nt.tags.includes(tag))
    );
  }, [searchFilteredNodeTypes, selectedTags]);

  // Tag counts for the filter buttons
  const overallTagCounts = useTagCounts(searchFilteredNodeTypes);
  const filteredTagCounts = useTagCounts(filteredNodeTypes);
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

  const handleSelectNode = (nodeType: NodeType) => {
    navigate(`/org/${orgHandle}/playground/${nodeType.type}`);
  };

  return (
    <InsetLayout
      title="Playground"
      childrenClassName="flex flex-col h-[calc(100%-theme(spacing.12))]"
    >
      <div className="flex flex-col gap-4 min-h-0 h-full">
        {/* Search */}
        <div className="relative shrink-0">
          <Input
            ref={searchInputRef}
            placeholder="Search nodes..."
            className="pl-4 text-base h-12"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-4 flex-1 min-h-0">
          {/* Node list */}
          <div className="flex-1 min-h-0">
            {isNodeTypesLoading ? (
              <div className="flex items-center justify-center py-16">
                <Spinner />
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="space-y-2 pr-4">
                  {filteredNodeTypes.map((template) => (
                    <div
                      key={template.type}
                      className="border rounded-lg cursor-pointer bg-card border-border hover:border-primary/50 transition-colors"
                      onClick={() => handleSelectNode(template)}
                    >
                      <div className="grid grid-cols-[1fr_auto] gap-6 p-4">
                        <div className="flex items-start gap-4 min-w-0">
                          <DynamicIcon
                            name={
                              iconNames.includes(template.icon as never)
                                ? template.icon
                                : "file-question"
                            }
                            className="h-5 w-5 text-blue-500 shrink-0 mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm leading-tight mb-1">
                              {template.name}
                            </h3>
                            {template.description && (
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {template.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-start pt-0.5">
                          <NodeTags tags={template.tags} />
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredNodeTypes.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <p className="text-sm">
                        No nodes found matching your search.
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Tag filter sidebar */}
          {tagCounts.length > 0 && (
            <div className="w-72 shrink-0">
              <TagFilterButtons
                categories={tagCounts}
                selectedTags={selectedTags}
                selectedTagCounts={selectedTagCounts}
                onTagChange={handleTagChange}
                totalCount={searchFilteredNodeTypes.length}
              />
              <div className="text-xs text-muted-foreground/60 pt-3 text-right">
                {filteredNodeTypes.length} of {executableNodeTypes.length} nodes
              </div>
            </div>
          )}
        </div>
      </div>
    </InsetLayout>
  );
}
