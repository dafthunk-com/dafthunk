import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { NodeType, fetchNodeTypes } from "@/services/workflowNodeService";

interface WorkflowNodeSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: NodeType) => void;
}

export function WorkflowNodeSelector({ open, onClose, onSelect }: WorkflowNodeSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [nodeTypes, setNodeTypes] = useState<NodeType[]>([]);

  useEffect(() => {
    fetchNodeTypes().then(setNodeTypes);
  }, []);

  const categories = Array.from(new Set(nodeTypes.map((t: NodeType) => t.category))) as string[];

  const filteredTemplates = nodeTypes.filter((template: NodeType) => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogTitle className="font-semibold text-lg">Add Node</DialogTitle>
        <div className="space-y-4 py-2 pb-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Select a node template to add to your workflow
            </p>
          </div>

          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />

          <div className="flex gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                !selectedCategory
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary hover:bg-secondary/80'
              }`}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  selectedCategory === category
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary hover:bg-secondary/80'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => onSelect(template)}
                  className="w-full text-left p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="font-medium">{template.name}</h3>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
} 