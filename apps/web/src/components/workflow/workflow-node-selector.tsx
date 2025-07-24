import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { CategoryFilterButtons } from "@/components/ui/category-filter-buttons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useKeyboardNavigation } from "@/hooks/use-keyboard-navigation";
import { useSearch } from "@/hooks/use-search";
import { getCategoryColor } from "@/utils/category-colors";
import { cn } from "@/utils/utils";

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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Get category counts (using first tag as primary category)
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    templates.forEach((template) => {
      const category = template.tags[0]; // Use first tag as primary category
      if (category) {
        counts[category] = (counts[category] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, count]) => ({ category, count }));
  }, [templates]);

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

  // Filter templates based on search results and selected category
  const filteredTemplates = searchResults.filter((template) => {
    const matchesCategory =
      !selectedCategory || template.tags.includes(selectedCategory);
    return matchesCategory;
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
    categoriesCount: categoryCounts.length + 1, // +1 for "All" button
    onClose,
    onSelectItem: (index) => {
      onSelect(filteredTemplates[index]);
      onClose();
    },
    onCategoryChange: (category) => {
      setSelectedCategory(category);
    },
    categories: categoryCounts,
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

        {categoryCounts.length > 0 && (
          <div className="px-4">
            <CategoryFilterButtons
              categories={categoryCounts}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
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
              const inputCount = template.inputs?.length || 0;
              const outputCount = template.outputs?.length || 0;

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
                        <h3 className="font-semibold text-base leading-tight truncate">
                          {template.name}
                        </h3>
                        <div className="flex gap-1 shrink-0">
                          {template.tags.map((tag, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className={`${getCategoryColor([tag])} text-xs`}
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {template.description && (
                        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                          {template.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {inputCount > 0 && (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <span className="font-medium">Inputs:</span>
                            <span>{inputCount}</span>
                          </div>
                        )}
                        {outputCount > 0 && (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span className="font-medium">Outputs:</span>
                            <span>{outputCount}</span>
                          </div>
                        )}
                      </div>
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
