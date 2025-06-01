import { KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";

type ActiveElement = "search" | "categories" | "items";

export interface UseKeyboardNavigationProps {
  open: boolean;
  itemsCount: number;
  categoriesCount: number;
  onClose: () => void;
  onSelectItem: (index: number) => void;
  onCategoryChange?: (category: string | null, index: number) => void;
  categories?: Array<{ category: string; count: number }>;
}

export function useKeyboardNavigation({
  open,
  itemsCount,
  categoriesCount,
  onClose,
  onSelectItem,
  onCategoryChange,
  categories = [],
}: UseKeyboardNavigationProps) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [activeElement, setActiveElement] = useState<ActiveElement>("search");

  const searchInputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const categoryButtonsRef = useRef<Map<number, HTMLButtonElement>>(new Map());

  // Reset focused index when filters change
  useEffect(() => {
    setFocusedIndex(0);
  }, [itemsCount]);

  // Focus search input when dialog opens
  useEffect(() => {
    if (open) {
      setActiveElement("search");
      searchInputRef.current?.focus();
    }
  }, [open]);

  // Scroll focused item into view
  useEffect(() => {
    if (activeElement === "items") {
      itemRefs.current.get(focusedIndex)?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [focusedIndex, activeElement]);

  const focusElement = useCallback((element: ActiveElement, index = 0) => {
    setActiveElement(element);

    if (element === "search") {
      searchInputRef.current?.focus();
    } else if (element === "categories") {
      setFocusedIndex(index);
      categoryButtonsRef.current.get(index)?.focus();
    } else if (element === "items") {
      setFocusedIndex(index);
      itemRefs.current.get(index)?.focus();
    }
  }, []);

  // Handle main keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (itemsCount === 0 && activeElement === "items") return;

      switch (e.key) {
        case "Tab":
          e.preventDefault();
          if (e.shiftKey) {
            // Shift+Tab - go backwards
            if (activeElement === "items") {
              if (categoriesCount > 0) {
                focusElement("categories", 0);
              } else {
                focusElement("search");
              }
            } else if (activeElement === "categories") {
              focusElement("search");
            }
          } else {
            // Tab - go forwards
            if (activeElement === "search") {
              if (categoriesCount > 0) {
                focusElement("categories", 0);
              } else if (itemsCount > 0) {
                focusElement("items", 0);
              }
            } else if (activeElement === "categories" && itemsCount > 0) {
              focusElement("items", 0);
            }
          }
          break;

        case "ArrowDown":
          e.preventDefault();
          if (activeElement === "search") {
            if (categoriesCount > 0) {
              focusElement("categories", 0);
            } else if (itemsCount > 0) {
              focusElement("items", 0);
            }
          } else if (activeElement === "categories" && itemsCount > 0) {
            focusElement("items", 0);
          } else if (activeElement === "items") {
            const nextIndex = Math.min(focusedIndex + 1, itemsCount - 1);
            focusElement("items", nextIndex);
          }
          break;

        case "ArrowUp":
          e.preventDefault();
          if (activeElement === "items") {
            if (focusedIndex > 0) {
              focusElement("items", focusedIndex - 1);
            } else if (categoriesCount > 0) {
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
          if (activeElement === "items" && focusedIndex < itemsCount) {
            onSelectItem(focusedIndex);
          }
          break;

        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    },
    [
      activeElement,
      focusedIndex,
      itemsCount,
      categoriesCount,
      focusElement,
      onSelectItem,
      onClose,
    ]
  );

  // Handle category button keydown
  const handleCategoryKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
      switch (e.key) {
        case "ArrowRight":
          if (index < categoriesCount) {
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
          if (itemsCount > 0) {
            e.preventDefault();
            focusElement("items", 0);
          }
          break;

        case "ArrowUp":
          e.preventDefault();
          focusElement("search");
          break;

        case "Enter":
          e.preventDefault();
          if (onCategoryChange) {
            const category =
              index === 0 ? null : categories[index - 1]?.category;
            onCategoryChange(category, index);
          }
          break;
      }
    },
    [categoriesCount, itemsCount, focusElement, onCategoryChange, categories]
  );

  // Handle item keydown
  const handleItemKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>, index: number) => {
      switch (e.key) {
        case "ArrowDown":
          if (index < itemsCount - 1) {
            e.preventDefault();
            focusElement("items", index + 1);
          }
          break;

        case "ArrowUp":
          e.preventDefault();
          if (index > 0) {
            focusElement("items", index - 1);
          } else if (categoriesCount > 0) {
            focusElement("categories", 0);
          } else {
            focusElement("search");
          }
          break;

        case "Enter":
          e.preventDefault();
          onSelectItem(index);
          break;
      }
    },
    [itemsCount, categoriesCount, focusElement, onSelectItem]
  );

  // Callback refs for DOM elements
  const setCategoryButtonRef = useCallback(
    (el: HTMLButtonElement | null, index: number) => {
      if (el) {
        categoryButtonsRef.current.set(index, el);
      } else {
        categoryButtonsRef.current.delete(index);
      }
    },
    []
  );

  const setItemRef = useCallback((el: HTMLDivElement | null, index: number) => {
    if (el) {
      itemRefs.current.set(index, el);
    } else {
      itemRefs.current.delete(index);
    }
  }, []);

  return {
    activeElement,
    focusedIndex,
    searchInputRef,
    handleKeyDown,
    handleCategoryKeyDown,
    handleItemKeyDown,
    setCategoryButtonRef,
    setItemRef,
    setActiveElement,
    setFocusedIndex,
  };
}
