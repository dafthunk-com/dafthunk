import { KeyboardEvent } from "react";

import { cn } from "@/utils/utils";

export interface TagCount {
  tag: string;
  count: number;
}

export interface TagFilterButtonsProps {
  categories: TagCount[];
  selectedTag: string | null;
  onTagChange: (tag: string | null) => void;
  totalCount: number;
  className?: string;
  disabled?: boolean;
  // Keyboard navigation support
  onKeyDown?: (e: KeyboardEvent<HTMLButtonElement>, index: number) => void;
  setCategoryButtonRef?: (el: HTMLButtonElement | null, index: number) => void;
  activeElement?: string;
  focusedIndex?: number;
}

export function TagFilterButtons({
  categories,
  selectedTag,
  onTagChange,
  totalCount,
  className,
  disabled = false,
  onKeyDown,
  setCategoryButtonRef,
  activeElement,
  focusedIndex,
}: TagFilterButtonsProps) {
  return (
    <div className={cn("flex gap-2 flex-wrap", className)}>
      <button
        ref={(el) => setCategoryButtonRef?.(el, 0)}
        className={cn(
          "border rounded-md px-2 py-1 text-xs transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          selectedTag === null ? "bg-accent" : "hover:bg-accent/50",
          activeElement === "categories" && focusedIndex === 0 && "bg-accent",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onClick={() => !disabled && onTagChange(null)}
        onKeyDown={(e) => onKeyDown?.(e, 0)}
        tabIndex={activeElement === "categories" && focusedIndex === 0 ? 0 : -1}
        disabled={disabled}
      >
        All <span className="text-muted-foreground">({totalCount})</span>
      </button>
      {categories.map(({ tag, count }, index) => (
        <button
          key={tag}
          ref={(el) => setCategoryButtonRef?.(el, index + 1)}
          className={cn(
            "border rounded-md px-2 py-1 text-xs transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            selectedTag === tag ? "bg-accent" : "hover:bg-accent/50",
            activeElement === "categories" &&
              focusedIndex === index + 1 &&
              "bg-accent",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onClick={() =>
            !disabled && onTagChange(selectedTag === tag ? null : tag)
          }
          onKeyDown={(e) => onKeyDown?.(e, index + 1)}
          tabIndex={
            activeElement === "categories" && focusedIndex === index + 1
              ? 0
              : -1
          }
          disabled={disabled}
        >
          {tag} <span className="text-muted-foreground">({count})</span>
        </button>
      ))}
    </div>
  );
}
