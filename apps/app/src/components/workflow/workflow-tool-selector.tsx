// @ts-ignore - https://github.com/lucide-icons/lucide/issues/2867#issuecomment-2847105863
import type { ToolReference } from "@dafthunk/types";
import { Wrench } from "lucide-react";
import { DynamicIcon } from "lucide-react/dynamic.mjs";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
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
import { highlightMatch } from "@/utils/text-highlight";
import { cn } from "@/utils/utils";

import { useTagFiltering, useTemplateSearch } from "./use-template-search";
import type { NodeType } from "./workflow-types";

export interface WorkflowToolSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (tool: ToolReference) => void;
  templates?: NodeType[];
  workflowName?: string;
  workflowDescription?: string;
}

export function WorkflowToolSelector({
  open,
  onClose,
  onSelect,
  templates = [],
  workflowName,
  workflowDescription,
}: WorkflowToolSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const toolTemplates = useMemo(() => {
    return templates.filter((template) => template.asTool);
  }, [templates]);

  const searchResults = useTemplateSearch(
    toolTemplates,
    searchTerm,
    workflowName,
    workflowDescription
  );

  const {
    selectedTags,
    filteredTemplates,
    tagCounts,
    selectedTagCounts,
    handleTagChange,
  } = useTagFiltering(searchResults.sorted);

  const handleToolSelect = (template: NodeType) => {
    onSelect({ type: "node", identifier: template.id });
    onClose();
  };

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
    categoriesCount: selectedTags.length + tagCounts.length + 1,
    onClose,
    onSelectItem: (index) => {
      handleToolSelect(filteredTemplates[index]);
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
          <DialogTitle>Select Tools</DialogTitle>
        </DialogHeader>

        <div className="relative px-4">
          <Wrench className="absolute left-8 top-5 h-6 w-6 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            placeholder="Search tools..."
            className={cn(
              "pl-14 text-xl h-16 border rounded-lg bg-accent",
              activeElement === "search"
                ? "border-primary"
                : "border-primary/20"
            )}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setActiveElement("search")}
          />
        </div>

        <div className="flex-1 flex gap-2 px-4 min-h-0">
          <ScrollArea className="flex-1">
            <div className="space-y-3 pr-4">
              {filteredTemplates.map((template, index) => {
                return (
                  <div
                    key={template.id}
                    ref={(el) => setItemRef(el, index)}
                    className={cn(
                      "border rounded-lg cursor-pointer bg-card",
                      focusedIndex === index && activeElement === "items"
                        ? "border-primary"
                        : "border-border hover:border-primary/50"
                    )}
                    onClick={() => handleToolSelect(template)}
                    onMouseEnter={() => {
                      setActiveElement("items");
                      setFocusedIndex(index);
                    }}
                    tabIndex={
                      focusedIndex === index && activeElement === "items"
                        ? 0
                        : -1
                    }
                    onFocus={() => {
                      setActiveElement("items");
                      setFocusedIndex(index);
                    }}
                    onKeyDown={(e) => handleItemKeyDown(e, index)}
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <DynamicIcon
                          name={template.icon as any}
                          className="h-5 w-5 text-blue-500 shrink-0 mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-base leading-tight">
                              {highlightMatch(template.name, searchTerm)}
                            </h3>
                            <div className="flex gap-1 shrink-0">
                              {template.tags.map((tag, tagIndex) => (
                                <Badge
                                  key={tagIndex}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          {template.description && (
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {highlightMatch(template.description, searchTerm)}
                            </p>
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

          {tagCounts.length > 0 && (
            <div className="w-80 shrink-0 flex flex-col">
              <div className="sticky top-0 flex-1">
                <TagFilterButtons
                  categories={tagCounts}
                  selectedTags={selectedTags}
                  selectedTagCounts={selectedTagCounts}
                  onTagChange={handleTagChange}
                  totalCount={searchResults.sorted.length}
                  onKeyDown={handleCategoryKeyDown}
                  setCategoryButtonRef={setCategoryButtonRef}
                  activeElement={activeElement}
                  focusedIndex={focusedIndex}
                />
              </div>
              <div className="text-xs text-muted-foreground/60 pt-4 text-right">
                {filteredTemplates.length} of {toolTemplates.length} tools
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
