import { useCallback, useEffect, useRef, useState } from "react";

const MIN_WIDTH = 320;
const MAX_WIDTH = 800;
const DEFAULT_WIDTH = 384;

interface UseResizableSidebarProps {
  initialVisible: boolean;
}

export interface UseResizableSidebarReturn {
  isSidebarVisible: boolean;
  sidebarWidth: number;
  isResizing: boolean;
  toggleSidebar: () => void;
  setIsSidebarVisible: (visible: boolean) => void;
  handleResizeStart: (e: React.MouseEvent) => void;
}

/**
 * State for a panel hugging its container's right edge: width dragged from a
 * handle on its left, visibility flipped from a toggle. A caller that owns
 * one instance and hands it to several surfaces gives them all the same
 * panel — the workflow page does this so Describe and Edit share one
 * sidebar, whose width and collapsed state survive the mode flip.
 */
export function useResizableSidebar({
  initialVisible,
}: UseResizableSidebarProps): UseResizableSidebarReturn {
  const [isSidebarVisible, setIsSidebarVisible] = useState(initialVisible);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);

  // The container edge the panel hugs, captured when the drag starts.
  // Measuring against this rather than `window.innerWidth` keeps the handle
  // under the cursor when the app is not flush with the viewport edge.
  const containerEdgeRef = useRef(0);

  const toggleSidebar = useCallback(() => {
    setIsSidebarVisible((prev) => !prev);
  }, []);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const container = e.currentTarget.parentElement;
    const rect = container?.getBoundingClientRect();
    containerEdgeRef.current = rect ? rect.right : window.innerWidth;
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = containerEdgeRef.current - e.clientX;
      setSidebarWidth(Math.min(Math.max(newWidth, MIN_WIDTH), MAX_WIDTH));
    };

    const handleMouseUp = () => setIsResizing(false);

    // Dragging across the canvas would otherwise select node labels and show
    // a text I-beam over the whole page.
    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  return {
    isSidebarVisible,
    sidebarWidth,
    isResizing,
    toggleSidebar,
    setIsSidebarVisible,
    handleResizeStart,
  };
}
