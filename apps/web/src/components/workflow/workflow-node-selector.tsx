import { useState, useEffect, useRef, KeyboardEvent } from "react";
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
import { WorkflowNodeSelectorProps } from "./workflow-types";
import { cn } from "@/utils/utils";

export function WorkflowNodeSelector({
  open,
  onClose,
  onSelect,
  templates = [],
}: WorkflowNodeSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [activeElement, setActiveElement] = useState<"search" | "categories" | "nodes">("search");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dialogRef = useRef<HTMLDivElement>(null);
  const categoryButtonsRef = useRef<(HTMLButtonElement | null)[]>([]);

  // Get unique categories from templates
  const categories = Array.from(
    new Set(templates.map((template) => template.category))
  );

  // Filter templates based on search term and selected category
  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      !selectedCategory || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Reset focused index when search term or category changes
  useEffect(() => {
    setFocusedIndex(0);
  }, [searchTerm, selectedCategory]);

  // Focus the search input when the dialog opens
  useEffect(() => {
    if (open) {
      setActiveElement("search");
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }
  }, [open]);

  // Update node refs array when filtered templates change
  useEffect(() => {
    nodeRefs.current = nodeRefs.current.slice(0, filteredTemplates.length);
  }, [filteredTemplates]);

  // Update category button refs when categories change
  useEffect(() => {
    categoryButtonsRef.current = categoryButtonsRef.current.slice(0, categories.length + 1); // +1 for "All" button
  }, [categories]);

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (filteredTemplates.length === 0 && activeElement === "nodes") return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (activeElement === "search") {
          if (categories.length > 0) {
            setActiveElement("categories");
            categoryButtonsRef.current[0]?.focus();
          } else if (filteredTemplates.length > 0) {
            setActiveElement("nodes");
            setFocusedIndex(0);
            nodeRefs.current[0]?.focus();
          }
        } else if (activeElement === "categories") {
          if (filteredTemplates.length > 0) {
            setActiveElement("nodes");
            setFocusedIndex(0);
            nodeRefs.current[0]?.focus();
          }
        } else if (activeElement === "nodes") {
          const nextIndex = focusedIndex < filteredTemplates.length - 1 ? focusedIndex + 1 : focusedIndex;
          setFocusedIndex(nextIndex);
          nodeRefs.current[nextIndex]?.focus();
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (activeElement === "nodes") {
          if (focusedIndex > 0) {
            const prevIndex = focusedIndex - 1;
            setFocusedIndex(prevIndex);
            nodeRefs.current[prevIndex]?.focus();
          } else if (categories.length > 0) {
            setActiveElement("categories");
            categoryButtonsRef.current[0]?.focus();
          } else {
            setActiveElement("search");
            searchInputRef.current?.focus();
          }
        } else if (activeElement === "categories") {
          setActiveElement("search");
          searchInputRef.current?.focus();
        }
        break;
      case "Enter":
        e.preventDefault();
        if (activeElement === "nodes" && filteredTemplates[focusedIndex]) {
          onSelect(filteredTemplates[focusedIndex]);
          onClose();
        }
        break;
      case "Escape":
        e.preventDefault();
        onClose();
        break;
      case "Tab":
        // Let the browser handle tab navigation naturally
        break;
    }
  };

  // Handle category button keydown
  const handleCategoryKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key === "ArrowRight" && index < categories.length) {
      e.preventDefault();
      categoryButtonsRef.current[index + 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      categoryButtonsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowDown" && filteredTemplates.length > 0) {
      e.preventDefault();
      setActiveElement("nodes");
      setFocusedIndex(0);
      nodeRefs.current[0]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveElement("search");
      searchInputRef.current?.focus();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (index === 0) {
        setSelectedCategory(null);
      } else {
        setSelectedCategory(categories[index - 1]);
      }
    }
  };

  // Handle node keydown
  const handleNodeKeyDown = (e: KeyboardEvent<HTMLDivElement>, index: number) => {
    if (e.key === "ArrowDown" && index < filteredTemplates.length - 1) {
      e.preventDefault();
      const nextIndex = index + 1;
      setFocusedIndex(nextIndex);
      nodeRefs.current[nextIndex]?.focus();
    } else if (e.key === "ArrowUp" && index > 0) {
      e.preventDefault();
      const prevIndex = index - 1;
      setFocusedIndex(prevIndex);
      nodeRefs.current[prevIndex]?.focus();
    } else if (e.key === "ArrowUp" && index === 0) {
      e.preventDefault();
      if (categories.length > 0) {
        setActiveElement("categories");
        categoryButtonsRef.current[0]?.focus();
      } else {
        setActiveElement("search");
        searchInputRef.current?.focus();
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      onSelect(filteredTemplates[index]);
      onClose();
    }
  };

  // Scroll the focused node into view
  useEffect(() => {
    if (activeElement === "nodes" && nodeRefs.current[focusedIndex]) {
      nodeRefs.current[focusedIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [focusedIndex, activeElement]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent 
        className="sm:max-w-[600px] h-[80vh] flex flex-col p-0"
        onKeyDown={handleKeyDown}
        tabIndex={-1}
        ref={dialogRef}
      >
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>Add Node</DialogTitle>
        </DialogHeader>

        <div className="relative px-4 mb-4">
          <Search className="absolute left-6 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            placeholder="Search nodes..."
            className={cn(
              "pl-8 border rounded-md",
              activeElement === "search" && "bg-accent"
            )}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setActiveElement("search")}
          />
        </div>

        {categories.length > 0 && (
          <div className="px-4 mb-4">
            <div className="flex gap-2 flex-wrap">
              <button
                ref={(el) => {
                  categoryButtonsRef.current[0] = el;
                }}
                className={cn(
                  "border rounded-md px-3 py-1.5 text-sm transition-colors",
                  selectedCategory === null
                    ? "bg-accent"
                    : "hover:bg-accent/50"
                )}
                onClick={() => setSelectedCategory(null)}
                onKeyDown={(e) => handleCategoryKeyDown(e, 0)}
                onFocus={() => setActiveElement("categories")}
              >
                All
              </button>
              {categories.map((category, index) => (
                <button
                  key={category}
                  ref={(el) => {
                    categoryButtonsRef.current[index + 1] = el;
                  }}
                  className={cn(
                    "border rounded-md px-3 py-1.5 text-sm transition-colors",
                    selectedCategory === category
                      ? "bg-accent"
                      : "hover:bg-accent/50"
                  )}
                  onClick={() => setSelectedCategory(category)}
                  onKeyDown={(e) => handleCategoryKeyDown(e, index + 1)}
                  onFocus={() => setActiveElement("categories")}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        )}

        <ScrollArea className="flex-1 px-4 pb-4">
          <div className="space-y-2">
            {filteredTemplates.map((template, index) => (
              <div
                key={template.id}
                ref={(el) => {
                  nodeRefs.current[index] = el;
                }}
                className={cn(
                  "border rounded-md p-3 cursor-pointer transition-colors",
                  focusedIndex === index && activeElement === "nodes"
                    ? "bg-accent"
                    : "hover:bg-accent/50"
                )}
                onClick={() => {
                  onSelect(template);
                  onClose();
                }}
                onMouseEnter={() => {
                  setActiveElement("nodes");
                  setFocusedIndex(index);
                }}
                tabIndex={focusedIndex === index && activeElement === "nodes" ? 0 : -1}
                onFocus={() => {
                  setActiveElement("nodes");
                  setFocusedIndex(index);
                }}
                onKeyDown={(e) => handleNodeKeyDown(e, index)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium">{template.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {template.description}
                </p>
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
