import { useCallback, useEffect, useState } from "react";

interface UseResizableSidebarProps {
  initialVisible: boolean;
}

interface UseResizableSidebarReturn {
  isSidebarVisible: boolean;
  sidebarWidth: number;
  isResizing: boolean;
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
      const newWidth = window.innerWidth - e.clientX;
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
    toggleSidebar,
    setIsSidebarVisible,
    handleResizeStart,
  };
}
