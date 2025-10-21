import { KeyboardEvent } from "react";

import { cn } from "@/utils/utils";

export interface TagCount {
  tag: string;
  count: number;
}

export interface TagFilterButtonsProps {
  categories: TagCount[];
  selectedTags?: string[];
  selectedTag?: string | null;
  selectedTagCounts?: TagCount[];
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
  selectedTags,
  selectedTag,
  selectedTagCounts,
  onTagChange,
  totalCount,
  className,
  disabled = false,
  onKeyDown,
  setCategoryButtonRef,
  activeElement,
  focusedIndex,
}: TagFilterButtonsProps) {
  // Support both hierarchical (selectedTags array) and flat (selectedTag) modes
  const selectedArray = selectedTags ?? (selectedTag ? [selectedTag] : []);
  const isHierarchical = selectedTags !== undefined;

  // Use selectedTagCounts order (already sorted by parent component)
  const sortedSelectedTags = isHierarchical && selectedTagCounts
    ? selectedTagCounts.map(tc => tc.tag)
    : selectedArray;

  let buttonIndex = 0;

  return (
    <div className={cn("flex gap-1.5 flex-wrap", className)}>
      {/* All button - always show, clears selection in hierarchical mode */}
      <button
        ref={(el) => setCategoryButtonRef?.(el, buttonIndex++)}
        className={cn(
          "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "border-transparent text-secondary-foreground",
          "cursor-pointer",
          isHierarchical && selectedArray.length > 0
            ? "bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800"
            : selectedArray.length === 0
              ? "bg-accent"
              : "bg-secondary hover:bg-secondary/80",
          activeElement === "categories" && focusedIndex === 0 && "ring-2 ring-ring",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onClick={() => !disabled && onTagChange(null)}
        onKeyDown={(e) => onKeyDown?.(e, 0)}
        tabIndex={activeElement === "categories" && focusedIndex === 0 ? 0 : -1}
        disabled={disabled}
      >
        All <span className="opacity-70 ml-1">({totalCount})</span>
      </button>

      {/* Selected tags - inline on the left */}
      {isHierarchical && sortedSelectedTags.map((tag) => {
        const tagCount = selectedTagCounts?.find(tc => tc.tag === tag);
        const currentButtonIndex = buttonIndex++;
        return (
          <button
            key={`selected-${tag}`}
            ref={(el) => setCategoryButtonRef?.(el, currentButtonIndex)}
            className={cn(
              "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              "border-transparent bg-blue-100 text-secondary-foreground",
              "dark:bg-blue-900 dark:text-secondary-foreground",
              "cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800",
              activeElement === "categories" &&
                focusedIndex === currentButtonIndex &&
                "ring-2 ring-ring",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => {
              if (!disabled) {
                onTagChange(tag);
              }
            }}
            onKeyDown={(e) => onKeyDown?.(e, currentButtonIndex)}
            tabIndex={
              activeElement === "categories" && focusedIndex === currentButtonIndex
                ? 0
                : -1
            }
            disabled={disabled}
          >
            {tag} <span className="opacity-70 ml-1">({tagCount?.count ?? 0})</span>
          </button>
        );
      })}

      {/* Available tags - filtered to exclude selected ones in hierarchical mode */}
      {categories
        .filter(({ tag }) => (isHierarchical ? !selectedArray.includes(tag) : true))
        .map(({ tag, count }) => {
          const isSelected = selectedArray.includes(tag);
          const currentButtonIndex = buttonIndex++;
          return (
            <button
              key={tag}
              ref={(el) => setCategoryButtonRef?.(el, currentButtonIndex)}
              className={cn(
                "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                "border-transparent bg-secondary text-secondary-foreground",
                "cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800",
                activeElement === "categories" &&
                  focusedIndex === currentButtonIndex &&
                  "ring-2 ring-ring",
                disabled && "opacity-30 cursor-not-allowed"
              )}
              onClick={() =>
                !disabled && onTagChange(isHierarchical ? tag : isSelected ? null : tag)
              }
              onKeyDown={(e) => onKeyDown?.(e, currentButtonIndex)}
              tabIndex={
                activeElement === "categories" && focusedIndex === currentButtonIndex
                  ? 0
                  : -1
              }
              disabled={disabled}
            >
              {tag} <span className="opacity-70 ml-1">({count})</span>
            </button>
          );
        })}
    </div>
  );
}
