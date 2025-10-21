import { DynamicIcon } from "lucide-react/dynamic.mjs";
import Search from "lucide-react/icons/search";
import { useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TagFilterButtons } from "@/components/ui/tag-filter-buttons";
import { useKeyboardNavigation } from "@/hooks/use-keyboard-navigation";
import { useTagCounts } from "@/hooks/use-tag-counts";
import { normalizeText } from "@/utils/text-normalization";
import { cn } from "@/utils/utils";

import { NodeTags } from "./node-tags";
import type { NodeTemplate } from "./workflow-types";

export interface WorkflowNodeSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: NodeTemplate) => void;
  templates?: NodeTemplate[];
  workflowName?: string;
  workflowDescription?: string;
}

// Helper function to highlight matching text
function highlightMatch(text: string, searchTerm: string) {
  if (!searchTerm.trim()) return text;

  // Split search term into individual words and escape special regex characters
  const words = searchTerm
    .trim()
    .split(/\s+/)
    .map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .filter(word => word.length > 0);

  if (words.length === 0) return text;

  // Create a regex that matches any of the words
  const regex = new RegExp(`(${words.join('|')})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, index) => {
    // Check if this part matches any of the search words
    if (words.some(word => new RegExp(`^${word}$`, 'i').test(part))) {
      return <mark key={index} className="bg-yellow-200 dark:bg-yellow-900 font-semibold">{part}</mark>;
    }
    return part;
  });
}

export function WorkflowNodeSelector({
  open,
  onClose,
  onSelect,
  templates = [],
  workflowName,
  workflowDescription,
}: WorkflowNodeSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Combined scoring using substring matching (not fuzzy)
  const scoredAndFilteredTemplates = useMemo(() => {
    // Normalize workflow context (for scoring only)
    const workflowKeywords = normalizeText(
      [workflowName, workflowDescription].filter(Boolean).join(" "),
      {
        removeStopWords: true,
        useLemmatization: true,
        minTokenLength: 2,
      }
    );

    // Normalize search query (for scoring only - no filtering)
    const searchKeywords = normalizeText(searchTerm, {
      removeStopWords: true,
      useLemmatization: true,
      minTokenLength: 2,
    });

    // Also keep original search term for partial matching
    const rawSearchTerm = searchTerm.toLowerCase().trim();

    // Helper function for partial word matching
    const containsPartialMatch = (text: string, searchTerm: string): boolean => {
      if (!searchTerm) return false;
      return text.toLowerCase().includes(searchTerm);
    };

    // Score each template
    const scored = templates
      .map((template) => {
        let score = 0;

        // Normalize template fields
        const nameTokens = new Set(
          normalizeText(template.name, {
            removeStopWords: false, // Keep all words in name
            useLemmatization: true,
            minTokenLength: 2,
          })
        );
        const descTokens = new Set(
          normalizeText(template.description, {
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

        // Score based on workflow keywords (always applied)
        workflowKeywords.forEach((keyword) => {
          if (nameTokens.has(keyword)) score += 10;
          if (descTokens.has(keyword)) score += 5;
          if (tagTokens.has(keyword)) score += 7;
        });

        // Score based on search keywords (if present) - exact token match
        searchKeywords.forEach((keyword) => {
          if (nameTokens.has(keyword)) score += 20; // Search is higher priority
          if (descTokens.has(keyword)) score += 10;
          if (tagTokens.has(keyword)) score += 15;
        });

        // Bonus scoring for partial matches in search term (substring matching)
        if (rawSearchTerm) {
          if (containsPartialMatch(template.name, rawSearchTerm)) score += 15;
          if (containsPartialMatch(template.description, rawSearchTerm))
            score += 8;
          template.tags.forEach((tag) => {
            if (containsPartialMatch(tag, rawSearchTerm)) score += 12;
          });
        }

        // Check if matches search filter (partial or exact match)
        const matchesSearch =
          !rawSearchTerm ||
          containsPartialMatch(template.name, rawSearchTerm) ||
          containsPartialMatch(template.description, rawSearchTerm) ||
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
      .filter((s) => s.matchesSearch) // Filter by search query
      .sort((a, b) => {
        // Sort by score (highest first), then alphabetically
        if (b.score !== a.score) return b.score - a.score;
        return a.template.name.localeCompare(b.template.name);
      });

    return {
      sorted: scored.map((s) => s.template),
      scores: scored,
    };
  }, [templates, workflowName, workflowDescription, searchTerm]);

  // Filter templates based on selected tags (all must match)
  const filteredTemplates = scoredAndFilteredTemplates.sorted.filter(
    (template) => {
      // If no tags selected, show all
      if (selectedTags.length === 0) return true;

      // Check if all selected tags match
      return selectedTags.every((selectedTag) => {
        if (selectedTag === "Tools") {
          return !!template.functionCalling;
        }
        return template.tags.includes(selectedTag);
      });
    }
  );

  // Get overall tag counts (for display)
  const overallTagCounts = useTagCounts(scoredAndFilteredTemplates.sorted);

  // Get filtered tag counts (for discrimination/ordering)
  const filteredTagCounts = useTagCounts(filteredTemplates);

  // Combine: use filtered counts for ordering, but display overall counts
  // Show top 20 tags by filtered count
  const tagCounts = filteredTagCounts
    .slice(0, 20)
    .map(({ tag }) => {
      const overallCount = overallTagCounts.find(tc => tc.tag === tag)?.count ?? 0;
      return { tag, count: overallCount };
    });

  // Get overall counts for selected tags (sorted by count desc, then alphabetically)
  const selectedTagCounts = overallTagCounts
    .filter((tc) => selectedTags.includes(tc.tag))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.tag.localeCompare(b.tag);
    });

  // Handle tag change (both keyboard and mouse)
  const handleTagChange = (tag: string | null) => {
    if (tag === null) {
      setSelectedTags([]);
    } else if (selectedTags.includes(tag)) {
      // Remove tag if already selected
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      // Add tag if not selected
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // Use keyboard navigation hook
  const {
    activeElement,
    focusedIndex,
    searchInputRef,
    handleKeyDown,
    handleCategoryKeyDown,
    handleItemKeyDown,
    setCategoryButtonRef,
    setItemRef,
    setActiveElement,
    setFocusedIndex,
  } = useKeyboardNavigation({
    open,
    itemsCount: filteredTemplates.length,
    categoriesCount: selectedTags.length + tagCounts.length + 1, // selected tags + available tags + "All" button
    onClose,
    onSelectItem: (index) => {
      onSelect(filteredTemplates[index]);
      onClose();
    },
    onCategoryChange: handleTagChange,
    categories: tagCounts,
  });

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className="w-[80vw] h-[80vh] max-w-[1400px] flex flex-col p-0"
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>Add Node</DialogTitle>
        </DialogHeader>

        <div className="relative px-4">
          <Search className="absolute left-6 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            placeholder="Search nodes..."
            className={cn(
              "pl-8 border rounded-md",
              activeElement === "search" && "bg-accent"
            )}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setActiveElement("search")}
          />
        </div>

        <div className="flex-1 flex gap-4 px-4 pb-4 min-h-0">
          <ScrollArea className="flex-1">
            <div className="space-y-3 pr-4">
            {filteredTemplates.map((template, index) => {
              return (
                <div
                  key={template.id}
                  ref={(el) => setItemRef(el, index)}
                  className={cn(
                    "border rounded-lg cursor-pointer transition-all hover:border-primary/50",
                    focusedIndex === index && activeElement === "items"
                      ? "bg-accent border-primary/50"
                      : "hover:bg-accent/50"
                  )}
                  onClick={() => {
                    onSelect(template);
                    onClose();
                  }}
                  onMouseEnter={() => {
                    setActiveElement("items");
                    setFocusedIndex(index);
                  }}
                  tabIndex={
                    focusedIndex === index && activeElement === "items" ? 0 : -1
                  }
                  onFocus={() => {
                    setActiveElement("items");
                    setFocusedIndex(index);
                  }}
                  onKeyDown={(e) => handleItemKeyDown(e, index)}
                >
                  <div className="grid grid-cols-[1fr_auto] gap-6 p-4">
                    <div className="flex items-start gap-4 min-w-0">
                      <DynamicIcon
                        name={template.icon as any}
                        className="h-5 w-5 text-blue-500 shrink-0 mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base leading-tight mb-2">
                          {highlightMatch(template.name, searchTerm)}
                        </h3>
                        {template.description && (
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {highlightMatch(template.description, searchTerm)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-start pt-1">
                      <NodeTags
                        tags={template.tags}
                        functionCalling={template.functionCalling}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
              {filteredTemplates.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-sm">No nodes found matching your search</p>
                </div>
              )}
            </div>
          </ScrollArea>

          {tagCounts.length > 0 && (
            <div className="w-80 shrink-0">
              <div className="sticky top-0">
                <TagFilterButtons
                  categories={tagCounts}
                  selectedTags={selectedTags}
                  selectedTagCounts={selectedTagCounts}
                  onTagChange={handleTagChange}
                  totalCount={scoredAndFilteredTemplates.sorted.length}
                  onKeyDown={handleCategoryKeyDown}
                  setCategoryButtonRef={setCategoryButtonRef}
                  activeElement={activeElement}
                  focusedIndex={focusedIndex}
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
