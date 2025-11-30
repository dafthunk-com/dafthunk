import type { WorkflowTemplate } from "@dafthunk/types";
// @ts-ignore - https://github.com/lucide-icons/lucide/issues/2867#issuecomment-2847105863
import { DynamicIcon } from "lucide-react/dynamic.mjs";
import FileText from "lucide-react/icons/file-text";
import Loader2 from "lucide-react/icons/loader-2";
import Wand from "lucide-react/icons/wand";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TagFilterButtons } from "@/components/ui/tag-filter-buttons";
import { useKeyboardNavigation } from "@/hooks/use-keyboard-navigation";
import { useTagCounts } from "@/hooks/use-tag-counts";
import { useTemplates } from "@/services/template-service";
import { cn } from "@/utils/utils";

export interface ImportTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportTemplate: (template: WorkflowTemplate) => Promise<void>;
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

export function ImportTemplateDialog({
  open,
  onOpenChange,
  onImportTemplate,
}: ImportTemplateDialogProps) {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [importingTemplateId, setImportingTemplateId] = useState<string | null>(
    null
  );

  const { templates, isTemplatesLoading, templatesError } = useTemplates();

  // Get tag counts
  const tagCounts = useTagCounts(templates);

  // Filter and score templates
  const filteredTemplates = useMemo(() => {
    const rawSearchTerm = searchQuery.toLowerCase().trim();

    return templates
      .filter((template) => {
        const matchesTag =
          !selectedTag || template.tags.includes(selectedTag);
        const matchesSearch =
          !rawSearchTerm ||
          template.name.toLowerCase().includes(rawSearchTerm) ||
          template.description.toLowerCase().includes(rawSearchTerm) ||
          template.tags.some((tag) =>
            tag.toLowerCase().includes(rawSearchTerm)
          );

        return matchesTag && matchesSearch;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [templates, selectedTag, searchQuery]);

  // Handle tag change
  const handleTagChange = (tag: string | null) => {
    setSelectedTag(tag);
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
    categoriesCount: tagCounts.length + 1,
    onClose: () => onOpenChange(false),
    onSelectItem: async (index) => {
      const template = filteredTemplates[index];
      if (template) {
        await handleImportTemplate(template);
      }
    },
    onCategoryChange: handleTagChange,
    categories: tagCounts,
  });

  const handleImportTemplate = async (template: WorkflowTemplate) => {
    setImportingTemplateId(template.id);
    try {
      await onImportTemplate(template);
      onOpenChange(false);
    } finally {
      setImportingTemplateId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[80vw] h-[80vh] max-w-[1400px] flex flex-col p-0"
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        <DialogTitle className="sr-only">Import Workflow Template</DialogTitle>

        {/* Search */}
        <div className="relative px-4 pt-4">
          <Wand className="absolute left-8 top-9 h-6 w-6 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            placeholder="Search templates..."
            className={cn(
              "pl-14 text-xl h-16 border rounded-lg bg-accent",
              activeElement === "search"
                ? "border-primary"
                : "border-primary/20"
            )}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setActiveElement("search")}
            disabled={importingTemplateId !== null || isTemplatesLoading}
          />
        </div>

        <div className="flex-1 flex gap-2 px-4 pb-4 min-h-0">
          {/* Templates */}
          <ScrollArea className="flex-1">
            {isTemplatesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : templatesError ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  Failed to load templates
                </h3>
                <p className="text-sm text-muted-foreground">
                  {templatesError.message}
                </p>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">
                  No templates found matching your search
                </p>
              </div>
            ) : (
              <div className="space-y-3 pr-4">
                {filteredTemplates.map((template, index) => (
                  <div
                    key={template.id}
                    ref={(el) => setItemRef(el, index)}
                    className={cn(
                      "border rounded-lg cursor-pointer bg-card",
                      focusedIndex === index && activeElement === "items"
                        ? "border-primary"
                        : "border-border hover:border-primary/50",
                      importingTemplateId === template.id && "opacity-50"
                    )}
                    onClick={() => handleImportTemplate(template)}
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
                          name={template.icon as any}
                          className="h-5 w-5 text-blue-500 shrink-0 mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base leading-tight mb-1">
                            {highlightMatch(template.name, searchQuery)}
                          </h3>
                          <p className="text-xs text-muted-foreground mb-2">
                            {template.type.replace("_", " ")}
                          </p>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {highlightMatch(template.description, searchQuery)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex flex-wrap gap-1 justify-end">
                          {template.tags.slice(0, 3).map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {template.nodes.length} nodes •{" "}
                          {template.edges.length} connections
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Tags */}
          {tagCounts.length > 0 && !isTemplatesLoading && (
            <div className="w-80 shrink-0 flex flex-col">
              <div className="sticky top-0 flex-1">
                <TagFilterButtons
                  categories={tagCounts}
                  selectedTag={selectedTag}
                  onTagChange={handleTagChange}
                  totalCount={templates.length}
                  onKeyDown={handleCategoryKeyDown}
                  setCategoryButtonRef={setCategoryButtonRef}
                  activeElement={activeElement}
                  focusedIndex={focusedIndex}
                  disabled={importingTemplateId !== null}
                />
              </div>
              <div className="text-xs text-muted-foreground/60 pt-4 text-right">
                {filteredTemplates.length} of {templates.length} templates
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
