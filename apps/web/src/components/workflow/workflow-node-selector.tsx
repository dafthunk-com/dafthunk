import { Search } from "lucide-react";
// @ts-ignore - https://github.com/lucide-icons/lucide/issues/2867#issuecomment-2847105863
import { DynamicIcon } from "lucide-react/dynamic.mjs";
import { useState } from "react";

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
import { useSearch } from "@/hooks/use-search";
import { useTagCounts } from "@/hooks/use-tag-counts";
import { cn } from "@/utils/utils";

import { NodeTags } from "./node-tags";
import type { NodeTemplate } from "./workflow-types";

export interface WorkflowNodeSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: NodeTemplate) => void;
  templates?: NodeTemplate[];
}

export function WorkflowNodeSelector({
  open,
  onClose,
  onSelect,
  templates = [],
}: WorkflowNodeSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Get tag counts (using all tags, not just the first one)
  const tagCounts = useTagCounts(templates);

  // Use the search hook with intelligent search
  const searchResults = useSearch({
    items: templates,
    searchQuery: searchTerm,
    searchFields: (template) => [
      template.name,
      template.description,
      ...template.tags,
    ],
  });

  // Filter templates based on search results and selected tag
  const filteredTemplates = searchResults.filter((template) => {
    if (selectedTag === "Tools") {
      return !!template.functionCalling;
    }
    const matchesTag = !selectedTag || template.tags.includes(selectedTag);
    return matchesTag;
  });

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
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <DynamicIcon
                          name={template.icon as any}
                          className="h-4 w-4 text-blue-500 shrink-0 [&svg>path]:stroke-2"
                        />
                        <h3 className="font-semibold text-base leading-tight truncate">
                          {template.name}
                        </h3>
                        <NodeTags
                          tags={template.tags}
                          functionCalling={template.functionCalling}
                        />
                      </div>
                      {template.description && (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {template.description}
                        </p>
                      )}
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
      </DialogContent>
    </Dialog>
  );
}
