import { Search } from "lucide-react";
import { KeyboardEvent, useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSearch } from "@/hooks/use-search";
import { getCategoryColor } from "@/utils/category-colors";
import { cn } from "@/utils/utils";

import type { NodeTemplate } from "./workflow-types";

type ActiveElement = "search" | "categories" | "nodes";

export interface WorkflowNodeSelectorProps {
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
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [activeElement, setActiveElement] = useState<ActiveElement>("search");

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Use callback refs instead of direct refs array assignments
  const nodeRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const categoryButtonsRef = useRef<Map<number, HTMLButtonElement>>(new Map());

  // Get unique categories from templates
  const categories = Array.from(
    new Set(templates.map((template) => template.category))
  );

  // Use the search hook with intelligent search
  const searchResults = useSearch({
    items: templates,
    searchQuery: searchTerm,
    searchFields: (template) => [
      template.name,
      template.description,
      template.category,
    ],
  });

  // Filter templates based on search results and selected category
  const filteredTemplates = searchResults.filter((template) => {
    const matchesCategory =
      !selectedCategory || template.category === selectedCategory;
    return matchesCategory;
  });

  // Reset focused index when filters change
  useEffect(() => {
    setFocusedIndex(0);
  }, [searchTerm, selectedCategory]);

  // Focus search input when dialog opens
  useEffect(() => {
    if (open) {
      setActiveElement("search");
      searchInputRef.current?.focus();
    }
  }, [open]);

  // Scroll focused node into view
  useEffect(() => {
    if (activeElement === "nodes") {
      nodeRefs.current.get(focusedIndex)?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [focusedIndex, activeElement]);

  const focusElement = (element: ActiveElement, index = 0) => {
    setActiveElement(element);

    if (element === "search") {
      searchInputRef.current?.focus();
    } else if (element === "categories") {
      categoryButtonsRef.current.get(index)?.focus();
    } else if (element === "nodes") {
      setFocusedIndex(index);
      nodeRefs.current.get(index)?.focus();
    }
  };

  const selectNode = (template: NodeTemplate) => {
    onSelect(template);
    onClose();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (filteredTemplates.length === 0 && activeElement === "nodes") return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (activeElement === "search") {
          if (categories.length > 0) {
            focusElement("categories", 0);
          } else if (filteredTemplates.length > 0) {
            focusElement("nodes", 0);
          }
        } else if (
          activeElement === "categories" &&
          filteredTemplates.length > 0
        ) {
          focusElement("nodes", 0);
        } else if (activeElement === "nodes") {
          const nextIndex = Math.min(
            focusedIndex + 1,
            filteredTemplates.length - 1
          );
          focusElement("nodes", nextIndex);
        }
        break;

      case "ArrowUp":
        e.preventDefault();
        if (activeElement === "nodes") {
          if (focusedIndex > 0) {
            focusElement("nodes", focusedIndex - 1);
          } else if (categories.length > 0) {
            focusElement("categories", 0);
          } else {
            focusElement("search");
          }
        } else if (activeElement === "categories") {
          focusElement("search");
        }
        break;

      case "Enter":
        e.preventDefault();
        if (activeElement === "nodes" && filteredTemplates[focusedIndex]) {
          selectNode(filteredTemplates[focusedIndex]);
        }
        break;

      case "Escape":
        e.preventDefault();
        onClose();
        break;
    }
  };

  // Handle category button keydown
  const handleCategoryKeyDown = (
    e: KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    switch (e.key) {
      case "ArrowRight":
        if (index < categories.length) {
          e.preventDefault();
          focusElement("categories", index + 1);
        }
        break;

      case "ArrowLeft":
        if (index > 0) {
          e.preventDefault();
          focusElement("categories", index - 1);
        }
        break;

      case "ArrowDown":
        if (filteredTemplates.length > 0) {
          e.preventDefault();
          focusElement("nodes", 0);
        }
        break;

      case "ArrowUp":
        e.preventDefault();
        focusElement("search");
        break;

      case "Enter":
        e.preventDefault();
        setSelectedCategory(index === 0 ? null : categories[index - 1]);
        break;
    }
  };

  // Handle node keydown
  const handleNodeKeyDown = (
    e: KeyboardEvent<HTMLDivElement>,
    index: number
  ) => {
    switch (e.key) {
      case "ArrowDown":
        if (index < filteredTemplates.length - 1) {
          e.preventDefault();
          focusElement("nodes", index + 1);
        }
        break;

      case "ArrowUp":
        e.preventDefault();
        if (index > 0) {
          focusElement("nodes", index - 1);
        } else if (categories.length > 0) {
          focusElement("categories", 0);
        } else {
          focusElement("search");
        }
        break;

      case "Enter":
        e.preventDefault();
        selectNode(filteredTemplates[index]);
        break;
    }
  };

  // Callback refs for DOM elements
  const setCategoryButtonRef = (
    el: HTMLButtonElement | null,
    index: number
  ) => {
    if (el) {
      categoryButtonsRef.current.set(index, el);
    } else {
      categoryButtonsRef.current.delete(index);
    }
  };

  const setNodeRef = (el: HTMLDivElement | null, index: number) => {
    if (el) {
      nodeRefs.current.set(index, el);
    } else {
      nodeRefs.current.delete(index);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className="sm:max-w-[700px] h-[80vh] flex flex-col p-0"
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>Add Node</DialogTitle>
        </DialogHeader>

        <div className="relative px-4">
          <Search className="absolute left-6 top-3 h-4 w-4 text-muted-foreground" />
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
                ref={(el) => setCategoryButtonRef(el, 0)}
                className={cn(
                  "border rounded-md px-3 py-1.5 text-sm transition-colors",
                  selectedCategory === null ? "bg-accent" : "hover:bg-accent/50"
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
                  ref={(el) => setCategoryButtonRef(el, index + 1)}
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
          <div className="space-y-3">
            {filteredTemplates.map((template, index) => {
              const inputCount = template.inputs?.length || 0;
              const outputCount = template.outputs?.length || 0;

              return (
                <div
                  key={template.id}
                  ref={(el) => setNodeRef(el, index)}
                  className={cn(
                    "border rounded-lg p-4 cursor-pointer transition-all hover:border-primary/50",
                    focusedIndex === index && activeElement === "nodes"
                      ? "bg-accent border-primary/50"
                      : "hover:bg-accent/50"
                  )}
                  onClick={() => selectNode(template)}
                  onMouseEnter={() => {
                    setActiveElement("nodes");
                    setFocusedIndex(index);
                  }}
                  tabIndex={
                    focusedIndex === index && activeElement === "nodes" ? 0 : -1
                  }
                  onFocus={() => {
                    setActiveElement("nodes");
                    setFocusedIndex(index);
                  }}
                  onKeyDown={(e) => handleNodeKeyDown(e, index)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-base leading-tight truncate">
                          {template.name}
                        </h3>
                        <Badge
                          variant="secondary"
                          className={`${getCategoryColor(template.category)} shrink-0 text-xs`}
                        >
                          {template.category}
                        </Badge>
                      </div>
                      {template.description && (
                        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                          {template.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {inputCount > 0 && (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <span className="font-medium">Inputs:</span>
                            <span>{inputCount}</span>
                          </div>
                        )}
                        {outputCount > 0 && (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span className="font-medium">Outputs:</span>
                            <span>{outputCount}</span>
                          </div>
                        )}
                      </div>
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
      </DialogContent>
    </Dialog>
  );
}
