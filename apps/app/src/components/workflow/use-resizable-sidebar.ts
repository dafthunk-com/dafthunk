import { useCallback, useEffect, useRef, useState } from "react";

interface UseResizableSidebarProps {
  initialVisible: boolean;
}

interface UseResizableSidebarReturn {
  isSidebarVisible: boolean;
  sidebarWidth: number;
  isResizing: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  toggleSidebar: () => void;
  setIsSidebarVisible: (visible: boolean) => void;
  handleResizeStart: (e: React.MouseEvent) => void;
}

export function useResizableSidebar({
  initialVisible,
}: UseResizableSidebarProps): UseResizableSidebarReturn {
  const [isSidebarVisible, setIsSidebarVisible] = useState(initialVisible);
  const [sidebarWidth, setSidebarWidth] = useState(384);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const toggleSidebar = useCallback(() => {
    setIsSidebarVisible((prev) => !prev);
  }, []);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const containerRight = containerRef.current
        ? containerRef.current.getBoundingClientRect().right
        : window.innerWidth;
      const newWidth = containerRight - e.clientX;
      setSidebarWidth(Math.min(Math.max(newWidth, 320), 800));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  return {
    isSidebarVisible,
    sidebarWidth,
    isResizing,
    containerRef,
    toggleSidebar,
    setIsSidebarVisible,
    handleResizeStart,
  };
}
