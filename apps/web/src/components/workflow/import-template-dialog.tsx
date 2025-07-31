import {
  BookOpen,
  Calculator,
  FileText,
  Globe,
  Mail,
  Palette,
  Search,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useCategoryCounts } from "@/hooks/use-tag-counts";
import { cn } from "@/utils/utils";

import type { WorkflowTemplate } from "./workflow-templates";
import { workflowTemplates } from "./workflow-templates";

export interface ImportTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportTemplate: (template: WorkflowTemplate) => Promise<void>;
}

const categoryIcons = {
  "text-processing": BookOpen,
  "data-processing": Calculator,
  communication: Mail,
  "web-scraping": Globe,
  "content-creation": Palette,
} as const;

const categoryLabels = {
  "text-processing": "Text Processing",
  "data-processing": "Data Processing",
  communication: "Communication",
  "web-scraping": "Web Scraping",
  "content-creation": "Content Creation",
} as const;

export function ImportTemplateDialog({
  open,
  onOpenChange,
  onImportTemplate,
}: ImportTemplateDialogProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [importingTemplateId, setImportingTemplateId] = useState<string | null>(
    null
  );

  // Get category counts
  const categoryCounts = useCategoryCounts(workflowTemplates);

  const filteredTemplates = workflowTemplates.filter((template) => {
    const matchesCategory =
      !selectedCategory || template.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      );

    return matchesCategory && matchesSearch;
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
    onClose: () => onOpenChange(false),
    onSelectItem: async (index) => {
      const template = filteredTemplates[index];
      if (template) {
        await handleImportTemplate(template);
      }
    },
    onCategoryChange: (category) => {
      setSelectedCategory(category);
    },
    categories: categoryCounts,
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

  const TemplateCard = ({
    template,
    index,
  }: {
    template: WorkflowTemplate;
    index: number;
  }) => {
    const IconComponent = categoryIcons[template.category];

    return (
      <div
        ref={(el) => setItemRef(el, index)}
        className={cn(
          "border rounded-lg p-4 transition-all cursor-pointer",
          focusedIndex === index && activeElement === "items"
            ? "bg-accent border-primary/50"
            : "hover:bg-muted/50"
        )}
        onClick={() => handleImportTemplate(template)}
        onMouseEnter={() => {
          setActiveElement("items");
          setFocusedIndex(index);
        }}
        tabIndex={focusedIndex === index && activeElement === "items" ? 0 : -1}
        onFocus={() => {
          setActiveElement("items");
          setFocusedIndex(index);
        }}
        onKeyDown={(e) => handleItemKeyDown(e, index)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-md">
              <IconComponent className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-sm">{template.name}</h3>
              <p className="text-xs text-muted-foreground">
                {categoryLabels[template.category]}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleImportTemplate(template);
            }}
            disabled={importingTemplateId !== null}
          >
            {importingTemplateId === template.id ? "Importing..." : "Import"}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          {template.description}
        </p>
        <div className="flex flex-wrap gap-1 mb-3">
          {template.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
        <div className="text-xs text-muted-foreground">
          {template.nodes.length} nodes • {template.edges.length} connections •{" "}
          {template.type.replace("_", " ")}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl h-[80vh] flex flex-col p-0"
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Import Workflow Template</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="px-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              ref={searchInputRef}
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn("pl-10", activeElement === "search" && "bg-accent")}
              onFocus={() => setActiveElement("search")}
              disabled={importingTemplateId !== null}
            />
          </div>
        </div>

        {/* Categories */}
        {categoryCounts.length > 0 && (
          <div className="px-6">
            <TagFilterButtons
              categories={categoryCounts.map(({ tag, count }) => ({
                tag: categoryLabels[tag] || tag,
                count,
              }))}
              selectedTag={
                selectedCategory
                  ? categoryLabels[selectedCategory] || selectedCategory
                  : null
              }
              onTagChange={(categoryLabel) => {
                if (!categoryLabel) {
                  setSelectedCategory(null);
                  return;
                }
                // Find the original category key from the label
                const originalCategory = Object.entries(categoryLabels).find(
                  ([, label]) => label === categoryLabel
                )?.[0];
                setSelectedCategory(originalCategory || categoryLabel);
              }}
              totalCount={workflowTemplates.length}
              onKeyDown={handleCategoryKeyDown}
              setCategoryButtonRef={setCategoryButtonRef}
              activeElement={activeElement}
              focusedIndex={focusedIndex}
              disabled={importingTemplateId !== null}
            />
          </div>
        )}

        {/* Templates */}
        <ScrollArea className="flex-1 px-6 pb-6">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                No templates found
              </h3>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search or filter criteria.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredTemplates.map((template, index) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  index={index}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
