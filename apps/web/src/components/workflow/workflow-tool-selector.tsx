import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TagFilterButtons } from "@/components/ui/tag-filter-buttons";
import { useKeyboardNavigation } from "@/hooks/use-keyboard-navigation";
import { useSearch } from "@/hooks/use-search";
import { useTagCounts } from "@/hooks/use-tag-counts";
import { getTagColor } from "@/utils/tag-colors";
import { cn } from "@/utils/utils";

import type { NodeTemplate } from "./workflow-types";

export interface ToolReference {
  type: "node";
  identifier: string;
}

export interface WorkflowToolSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (tools: ToolReference[]) => void;
  templates?: NodeTemplate[];
  selectedTools?: ToolReference[];
}

export function WorkflowToolSelector({
  open,
  onClose,
  onSelect,
  templates = [],
  selectedTools = [],
}: WorkflowToolSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [localSelectedTools, setLocalSelectedTools] = useState<Set<string>>(
    new Set(selectedTools.map((tool) => tool.identifier))
  );

  // Filter templates to only show nodes that can be used as tools
  const toolTemplates = useMemo(() => {
    return templates.filter((template) => template.asTool);
  }, [templates]);

  // Get tag counts (using all tags, not just the first one)
  const tagCounts = useTagCounts(toolTemplates);

  // Use the search hook with intelligent search
  const searchResults = useSearch({
    items: toolTemplates,
    searchQuery: searchTerm,
    searchFields: (template) => [
      template.name,
      template.description,
      ...template.tags,
    ],
  });

  // Filter templates based on search results and selected tag
  const filteredTemplates = searchResults.filter((template) => {
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
      const template = filteredTemplates[index];
      handleTemplateToggle(template.id);
    },
    onCategoryChange: (tag) => {
      setSelectedTag(tag);
    },
    categories: tagCounts,
  });

  const handleTemplateToggle = (templateId: string) => {
    setLocalSelectedTools((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(templateId)) {
        newSet.delete(templateId);
      } else {
        newSet.add(templateId);
      }
      return newSet;
    });
  };

  const handleConfirm = () => {
    const tools: ToolReference[] = Array.from(localSelectedTools).map((id) => ({
      type: "node",
      identifier: id,
    }));
    onSelect(tools);
    onClose();
  };

  const handleCancel = () => {
    setLocalSelectedTools(
      new Set(selectedTools.map((tool) => tool.identifier))
    );
    onClose();
  };

  // Reset local state when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setLocalSelectedTools(
        new Set(selectedTools.map((tool) => tool.identifier))
      );
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-[700px] h-[80vh] flex flex-col p-0"
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>Select Tools</DialogTitle>
        </DialogHeader>

        <div className="relative px-4">
          <Search className="absolute left-6 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            placeholder="Search tools..."
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
              totalCount={toolTemplates.length}
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
              const isSelected = localSelectedTools.has(template.id);

              return (
                <div
                  key={template.id}
                  ref={(el) => setItemRef(el, index)}
                  className={cn(
                    "border rounded-lg p-4 cursor-pointer transition-all hover:border-primary/50",
                    focusedIndex === index && activeElement === "items"
                      ? "bg-accent border-primary/50"
                      : "hover:bg-accent/50",
                    isSelected &&
                      "bg-blue-50 border-blue-300 dark:bg-blue-950/20 dark:border-blue-700"
                  )}
                  onClick={() => handleTemplateToggle(template.id)}
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
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      onChange={() => handleTemplateToggle(template.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-base leading-tight truncate">
                          {template.name}
                        </h3>
                        <div className="flex gap-1 shrink-0">
                          {template.tags.map((tag, tagIndex) => (
                            <Badge
                              key={tagIndex}
                              variant="secondary"
                              className={`${getTagColor([tag])} text-xs`}
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
                <p className="text-sm">No tools found matching your search</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="px-4 pb-4">
          <div className="flex justify-between items-center w-full">
            <p className="text-sm text-muted-foreground">
              {localSelectedTools.size} tool
              {localSelectedTools.size !== 1 ? "s" : ""} selected
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleConfirm}>Confirm Selection</Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
