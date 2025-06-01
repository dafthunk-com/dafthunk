import { KeyboardEvent } from "react";

import { cn } from "@/utils/utils";

export interface CategoryCount {
  category: string;
  count: number;
}

export interface CategoryFilterButtonsProps {
  categories: CategoryCount[];
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  totalCount: number;
  className?: string;
  // Keyboard navigation support
  onKeyDown?: (e: KeyboardEvent<HTMLButtonElement>, index: number) => void;
  setCategoryButtonRef?: (el: HTMLButtonElement | null, index: number) => void;
  activeElement?: string;
  focusedIndex?: number;
}

export function CategoryFilterButtons({
  categories,
  selectedCategory,
  onCategoryChange,
  totalCount,
  className,
  onKeyDown,
  setCategoryButtonRef,
  activeElement,
  focusedIndex,
}: CategoryFilterButtonsProps) {
  return (
    <div className={cn("flex gap-2 flex-wrap", className)}>
      <button
        ref={(el) => setCategoryButtonRef?.(el, 0)}
        className={cn(
          "border rounded-md px-3 py-1.5 text-sm transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          selectedCategory === null ? "bg-accent" : "hover:bg-accent/50",
          activeElement === "categories" && focusedIndex === 0 && "bg-accent"
        )}
        onClick={() => onCategoryChange(null)}
        onKeyDown={(e) => onKeyDown?.(e, 0)}
        tabIndex={activeElement === "categories" && focusedIndex === 0 ? 0 : -1}
      >
        All <span className="text-muted-foreground">({totalCount})</span>
      </button>
      {categories.map(({ category, count }, index) => (
        <button
          key={category}
          ref={(el) => setCategoryButtonRef?.(el, index + 1)}
          className={cn(
            "border rounded-md px-3 py-1.5 text-sm transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            selectedCategory === category ? "bg-accent" : "hover:bg-accent/50",
            activeElement === "categories" &&
              focusedIndex === index + 1 &&
              "bg-accent"
          )}
          onClick={() =>
            onCategoryChange(selectedCategory === category ? null : category)
          }
          onKeyDown={(e) => onKeyDown?.(e, index + 1)}
          tabIndex={
            activeElement === "categories" && focusedIndex === index + 1
              ? 0
              : -1
          }
        >
          {category} <span className="text-muted-foreground">({count})</span>
        </button>
      ))}
    </div>
  );
}
