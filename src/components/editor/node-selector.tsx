import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { WorkflowNodeType, fetchNodeTypes } from "./workflow-templates";

interface NodeSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: WorkflowNodeType) => void;
}

export function NodeSelector({ open, onClose, onSelect }: NodeSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [nodeTypes, setNodeTypes] = useState<WorkflowNodeType[]>([]);

  useEffect(() => {
    fetchNodeTypes().then(setNodeTypes);
  }, []);

  const categories = Array.from(new Set(nodeTypes.map((t: WorkflowNodeType) => t.category))) as string[];

  const filteredTemplates = nodeTypes.filter((template: WorkflowNodeType) => {
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
                    <div className="p-2 rounded-md bg-primary/10">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
                        />
                      </svg>
                    </div>
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