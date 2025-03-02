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

export interface NodeTemplate {
  id: string;
  type: string;
  label: string;
  description: string;
  category: string;
  icon?: string;
  inputs: Array<{
    id: string;
    type: string;
    label: string;
  }>;
  outputs: Array<{
    id: string;
    type: string;
    label: string;
  }>;
}

interface WorkflowNodeSelectorProps {
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
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Node</DialogTitle>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search nodes..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

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

        <ScrollArea className="flex-1 pr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="border rounded-md p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => {
                  onSelect(template);
                  onClose();
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  {template.icon && (
                    <span className="text-gray-500">{template.icon}</span>
                  )}
                  <h3 className="font-medium text-sm">{template.label}</h3>
                </div>
                <p className="text-xs text-gray-500 mb-2">
                  {template.description}
                </p>
                <div className="flex justify-between text-xs">
                  <span>
                    {template.inputs.length} input
                    {template.inputs.length !== 1 ? "s" : ""}
                  </span>
                  <span>
                    {template.outputs.length} output
                    {template.outputs.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            ))}
            {filteredTemplates.length === 0 && (
              <div className="col-span-2 text-center py-8 text-gray-500">
                No nodes found matching your search
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
} 