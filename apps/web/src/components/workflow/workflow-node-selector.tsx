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

export function WorkflowNodeSelector({
  open,
  onClose,
  onSelect,
  templates = [],
  workflowName,
  workflowDescription,
}: WorkflowNodeSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Get tag counts (using all tags, not just the first one)
  const tagCounts = useTagCounts(templates);

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

  // Filter templates based on selected tag
  const filteredTemplates = scoredAndFilteredTemplates.sorted.filter(
    (template) => {
      if (selectedTag === "Tools") {
        return !!template.functionCalling;
      }
      const matchesTag = !selectedTag || template.tags.includes(selectedTag);
      return matchesTag;
    }
  );

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
    categoriesCount: tagCounts.length + 1, // +1 for "All" button
    onClose,
    onSelectItem: (index) => {
      onSelect(filteredTemplates[index]);
      onClose();
    },
    onCategoryChange: (tag) => {
      setSelectedTag(tag);
    },
    categories: tagCounts,
  });

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className="sm:max-w-[700px] h-[80vh] flex flex-col p-0"
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

        {tagCounts.length > 0 && (
          <div className="px-4">
            <TagFilterButtons
              categories={tagCounts}
              selectedTag={selectedTag}
              onTagChange={setSelectedTag}
              totalCount={templates.length}
              onKeyDown={handleCategoryKeyDown}
              setCategoryButtonRef={setCategoryButtonRef}
              activeElement={activeElement}
              focusedIndex={focusedIndex}
            />
          </div>
        )}

        <ScrollArea className="flex-1 px-4 pb-4">
          <div className="space-y-3">
            {filteredTemplates.map((template, index) => {
              return (
                <div
                  key={template.id}
                  ref={(el) => setItemRef(el, index)}
                  className={cn(
                    "border rounded-lg p-4 cursor-pointer transition-all hover:border-primary/50",
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
                  <div className="flex items-start gap-4">
                    <div className="h-4 w-4 rounded-full bg-blue-500/20 shrink-0 mt-1" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base leading-tight mb-2">
                        {template.name}
                      </h3>
                      {template.description && (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {template.description}
                        </p>
                      )}
                    </div>
                    <NodeTags
                      tags={template.tags}
                      functionCalling={template.functionCalling}
                      className="shrink-0 ml-auto"
                    />
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
      </DialogContent>
    </Dialog>
  );
}
