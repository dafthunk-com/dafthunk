import { Wand } from "lucide-react";
import { DynamicIcon, iconNames } from "lucide-react/dynamic.mjs";
import { useMemo, useState } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TagFilterButtons } from "@/components/ui/tag-filter-buttons";
import { useKeyboardNavigation } from "@/hooks/use-keyboard-navigation";
import { cn } from "@/utils/utils";

import { NodeTags } from "./node-tags";
import { SubscriptionBadge } from "./subscription-badge";
import { useTagFiltering, useTemplateSearch } from "./use-template-search";
import type { NodeType } from "./workflow-types";

export interface WorkflowNodeSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: NodeType) => void;
  templates?: NodeType[];
  workflowName?: string;
  workflowDescription?: string;
  hasTriggerNode?: boolean;
}

// Helper function to highlight matching text
function highlightMatch(text: string, searchTerm: string) {
  if (!searchTerm.trim()) return text;

  const words = searchTerm
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .filter((word) => word.length > 0);

  if (words.length === 0) return text;

  const regex = new RegExp(`(${words.join("|")})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, index) => {
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

export function WorkflowNodeSelector({
  open,
  onClose,
  onSelect,
  templates = [],
  workflowName,
  workflowDescription,
  hasTriggerNode,
}: WorkflowNodeSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // Filter out trigger nodes if one already exists
  const compatibleTemplates = useMemo(() => {
    if (!hasTriggerNode) return templates;
    return templates.filter((template) => !template.trigger);
  }, [templates, hasTriggerNode]);

  const searchResults = useTemplateSearch(
    compatibleTemplates,
    searchTerm,
    workflowName,
    workflowDescription
  );

  // Node selector has special "Tools" tag handling
  const nodeTagFilter = (template: NodeType, tag: string) => {
    if (tag === "Tools") return !!template.functionCalling;
    return template.tags.includes(tag);
  };

  const {
    selectedTags,
    filteredTemplates,
    tagCounts,
    selectedTagCounts,
    handleTagChange,
  } = useTagFiltering(searchResults.sorted, nodeTagFilter);

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
        <DialogTitle className="sr-only">Select a node</DialogTitle>
        <div className="relative px-4 pt-4">
          <Wand className="absolute left-8 top-9 h-6 w-6 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            placeholder="Search nodes..."
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

        <div className="flex-1 flex gap-2 px-4 pb-4 min-h-0">
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
                    onClick={() => {
                      onSelect(template);
                      onClose();
                    }}
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
                    <div className="grid grid-cols-[1fr_auto] gap-6 p-4">
                      <div className="flex items-start gap-4 min-w-0">
                        <DynamicIcon
                          name={
                            iconNames.includes(template.icon as any)
                              ? template.icon
                              : "file-question"
                          }
                          className={cn(
                            "h-5 w-5 shrink-0 mt-0.5",
                            template.trigger
                              ? "text-emerald-500"
                              : "text-blue-500"
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base leading-tight mb-2 flex items-center gap-2">
                            <span>
                              {highlightMatch(template.name, searchTerm)}
                            </span>
                            {template.subscription && (
                              <SubscriptionBadge variant="muted" size="lg" />
                            )}
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
                {filteredTemplates.length} of {compatibleTemplates.length} nodes
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
