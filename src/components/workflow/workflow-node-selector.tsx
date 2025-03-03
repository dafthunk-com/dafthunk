import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkflowNodeSelectorProps } from "./workflow-types";

export function WorkflowNodeSelector({
  open,
  onClose,
  onSelect,
  templates = [],
}: WorkflowNodeSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Get unique categories from templates
  const categories = Array.from(
    new Set(templates.map((template) => template.category))
  );

  // Filter templates based on search term and selected category
  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      !selectedCategory || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Node</DialogTitle>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search nodes..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <ScrollArea className="flex-grow pr-4">
          {categories.length > 0 && (
            <div className="flex gap-2 mb-4 flex-wrap">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
              >
                All
              </Button>
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          )}

          <div className="space-y-2">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="border rounded-md p-3 cursor-pointer hover:bg-accent transition-colors"
                onClick={() => {
                  onSelect(template);
                  onClose();
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium">{template.label}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {template.description}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <div className={cn("flex items-center", template.inputs.length === 0 && "opacity-50")}>
                    <span>
                      {template.inputs.length} input{template.inputs.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className={cn("flex items-center", template.outputs.length === 0 && "opacity-50")}>
                    <span>
                      {template.outputs.length} output{template.outputs.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {filteredTemplates.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No nodes found matching your search
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
} 