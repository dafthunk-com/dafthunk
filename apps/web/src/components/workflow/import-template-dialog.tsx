import {
  Bot,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { WorkflowTemplate } from "./workflow-templates";
import { workflowTemplates } from "./workflow-templates";

export interface ImportTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportTemplate: (template: WorkflowTemplate) => Promise<void>;
}

const categoryIcons = {
  "ai-automation": Bot,
  "data-processing": Calculator,
  communication: Mail,
  "web-scraping": Globe,
  "content-creation": Palette,
} as const;

const categoryLabels = {
  "ai-automation": "AI Automation",
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
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const filteredTemplates = workflowTemplates.filter((template) => {
    const matchesCategory =
      selectedCategory === "all" || template.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      );

    return matchesCategory && matchesSearch;
  });

  const categories = [
    "ai-automation",
    "data-processing",
    "communication",
    "web-scraping",
    "content-creation",
  ] as const;

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

          {/* Templates */}
          <div className="overflow-y-auto max-h-[500px]">
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="all" className="text-xs">
                  All
                </TabsTrigger>
                {categories.map((category) => {
                  return (
                    <TabsTrigger
                      key={category}
                      value={category}
                      className="text-xs flex items-center gap-1"
                    >
                      <span className="hidden sm:inline">
                        {categoryLabels[category].split(" ")[0]}
                      </span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              <TabsContent value={selectedCategory} className="mt-4">
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
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
