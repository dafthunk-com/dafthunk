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
  const [isImporting, setIsImporting] = useState(false);

  // Get unique categories from templates
  const categories = Array.from(
    new Set(workflowTemplates.map((template) => template.category))
  );

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

  const handleImportTemplate = async (template: WorkflowTemplate) => {
    setIsImporting(true);
    try {
      await onImportTemplate(template);
      onOpenChange(false);
    } finally {
      setIsImporting(false);
    }
  };

  const TemplateCard = ({ template }: { template: WorkflowTemplate }) => {
    const IconComponent = categoryIcons[template.category];

    return (
      <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
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
            onClick={() => handleImportTemplate(template)}
            disabled={isImporting}
          >
            {isImporting ? "Importing..." : "Import"}
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
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Import Workflow Template</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Categories */}
          {categories.length > 0 && (
            <div className="mb-4">
              <div className="flex gap-2 flex-wrap">
                <button
                  className={cn(
                    "border rounded-md px-3 py-1.5 text-sm transition-colors",
                    selectedCategory === null
                      ? "bg-accent"
                      : "hover:bg-accent/50"
                  )}
                  onClick={() => setSelectedCategory(null)}
                >
                  All
                </button>
                {categories.map((category) => (
                  <button
                    key={category}
                    className={cn(
                      "border rounded-md px-3 py-1.5 text-sm transition-colors",
                      selectedCategory === category
                        ? "bg-accent"
                        : "hover:bg-accent/50"
                    )}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {categoryLabels[category] || category}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Templates */}
          <div className="overflow-y-auto max-h-[500px]">
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
                {filteredTemplates.map((template) => (
                  <TemplateCard key={template.id} template={template} />
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
