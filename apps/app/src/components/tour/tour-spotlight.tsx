import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";

interface SpotlightRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface TourSpotlightProps {
  targetSelector: string;
  padding?: number;
  children: ReactNode;
}

export function TourSpotlight({
  targetSelector,
  padding = 8,
  children,
}: TourSpotlightProps) {
  const [targetRect, setTargetRect] = useState<SpotlightRect | null>(null);

  const updateTargetRect = useCallback(() => {
    const target = document.querySelector(targetSelector);
    if (target) {
      const rect = target.getBoundingClientRect();
      setTargetRect({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      });

      // Scroll element into view if needed
      const isInViewport =
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= window.innerHeight &&
        rect.right <= window.innerWidth;

      if (!isInViewport) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        // Update rect after scroll
        setTimeout(() => {
          const newRect = target.getBoundingClientRect();
          setTargetRect({
            left: newRect.left,
            top: newRect.top,
            width: newRect.width,
            height: newRect.height,
          });
        }, 300);
      }
    }
  }, [targetSelector]);

  useEffect(() => {
    updateTargetRect();

    window.addEventListener("resize", updateTargetRect);
    window.addEventListener("scroll", updateTargetRect, true);

    return () => {
      window.removeEventListener("resize", updateTargetRect);
      window.removeEventListener("scroll", updateTargetRect, true);
    };
  }, [updateTargetRect]);

  if (!targetRect) {
    return null;
  }

  const spotlightLeft = targetRect.left - padding;
  const spotlightTop = targetRect.top - padding;
  const spotlightRight = targetRect.left + targetRect.width + padding;
  const spotlightBottom = targetRect.top + targetRect.height + padding;

  return (
    <>
      {/* Dark overlay with spotlight cutout using clip-path */}
      <div
        className="fixed inset-0 z-50 pointer-events-none transition-all duration-200"
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.75)",
          clipPath: `polygon(
            0% 0%,
            0% 100%,
            ${spotlightLeft}px 100%,
            ${spotlightLeft}px ${spotlightTop}px,
            ${spotlightRight}px ${spotlightTop}px,
            ${spotlightRight}px ${spotlightBottom}px,
            ${spotlightLeft}px ${spotlightBottom}px,
            ${spotlightLeft}px 100%,
            100% 100%,
            100% 0%
          )`,
        }}
        aria-hidden="true"
      />

      {/* Spotlight border/highlight */}
      <div
        className="fixed z-50 rounded-lg pointer-events-none ring-2 ring-primary ring-offset-2 ring-offset-background transition-all duration-200"
        style={{
          left: spotlightLeft,
          top: spotlightTop,
          width: targetRect.width + padding * 2,
          height: targetRect.height + padding * 2,
        }}
        aria-hidden="true"
      />

      {/* Children (popover content) */}
      {children}
    </>
  );
}
