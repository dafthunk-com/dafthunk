import type React from "react";

import type { UseResizableSidebarReturn } from "@/components/workflow/use-resizable-sidebar";
import { cn } from "@/utils/utils";

/**
 * The workflow page's stage in Describe mode: the canvas on the left, the
 * conversation in a sidebar on the right — the same panel position, surface,
 * and resize chrome as Edit mode's properties inspector, so flipping modes
 * reads as the panel changing contents, never the page rearranging.
 *
 * The rail's width and visibility come in from the caller rather than living
 * here: the workflow page owns one `useResizableSidebar` and hands it to both
 * modes, which is what keeps the panel's size and collapsed state identical
 * across the flip.
 *
 * On small screens the panel is the page: the rail stacks first, and the
 * canvas pane appears below it only once there is something on it. The rail
 * scrolls internally; the page does not scroll at all.
 *
 * `banner` carries transport news above whatever screen is showing — it must
 * ride along rather than replace, because a dropped socket is not a change in
 * what the session is doing.
 */
export function ConversationShell({
  banner,
  canvas,
  rail,
  children,
}: {
  banner?: React.ReactNode;
  /** What is on the workbench; the empty editor surface when omitted. */
  canvas?: React.ReactNode;
  /** The page's shared panel state — one sidebar, worn by both modes. */
  rail: UseResizableSidebarReturn;
  children: React.ReactNode;
}) {
  // DOM order is rail-then-canvas for the small-screen stack; row-reverse
  // seats the rail on the right without disturbing that stack.
  return (
    <div className="flex flex-col lg:h-full lg:flex-row-reverse lg:overflow-hidden">
      <div
        className={cn(
          "w-full lg:h-full lg:w-[var(--rail-width)] lg:shrink-0 lg:overflow-y-auto",
          // The properties sidebar's surface and hairline, so the panel keeps
          // its skin when the mode flips. Small screens stay on the page
          // background: there the rail is the page, not a panel.
          "lg:border-s lg:bg-neutral-50 lg:dark:bg-neutral-800",
          !rail.isSidebarVisible && "lg:hidden"
        )}
        style={
          { "--rail-width": `${rail.sidebarWidth}px` } as React.CSSProperties
        }
      >
        <div className="space-y-6 px-6 py-16 lg:py-12">
          {banner}
          {children}
        </div>
      </div>
      {/* The editor's resize affordance, verbatim: two hairlines flanking a
          light strip — the handle's own border plus the rail's — is what
          reads as "draggable" on the properties sidebar. */}
      {rail.isSidebarVisible && (
        <div
          className={cn(
            "hidden lg:block w-1 shrink-0 border-l border-border bg-neutral-50 cursor-col-resize",
            rail.isResizing && "bg-muted"
          )}
          onMouseDown={rail.handleResizeStart}
        />
      )}
      <div
        className={cn(
          canvas ? "block h-72 w-full border-t" : "hidden",
          "lg:block lg:h-full lg:min-w-0 lg:flex-1 lg:border-t-0"
        )}
      >
        {canvas || <EmptyCanvas />}
      </div>
    </div>
  );
}

/**
 * The workbench with nothing on it yet — the editor's surface, so the place
 * where the workflow will appear exists before the workflow does, and
 * filling it is a change of contents rather than a change of scenery.
 *
 * CSS dots rather than a React Flow instance: an engine is a lot to run for
 * a background, and at 1px and 3% opacity the two are indistinguishable.
 */
export function EmptyCanvas({ children }: { children?: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex h-full items-center justify-center p-6 bg-neutral-100/50",
        "[background-image:radial-gradient(hsl(var(--foreground)/0.04)_1px,transparent_1px)] [background-size:12px_12px]"
      )}
    >
      {children ?? (
        <div className="flex flex-col items-center gap-5">
          {/* A foreshadowing, not a diagram: the shape of what will appear,
              in dashes — so the empty pane reads as awaiting, not missing. */}
          <div aria-hidden="true" className="flex items-center opacity-60">
            <div className="h-9 w-24 rounded-md border border-dashed border-muted-foreground/40" />
            <div className="w-6 border-t border-dashed border-muted-foreground/40" />
            <div className="h-9 w-24 rounded-md border border-dashed border-muted-foreground/40" />
            <div className="w-6 border-t border-dashed border-muted-foreground/40" />
            <div className="h-9 w-24 rounded-md border border-dashed border-muted-foreground/40" />
          </div>
          <p className="text-sm text-muted-foreground/60">
            Your workflow takes shape here
          </p>
        </div>
      )}
    </div>
  );
}
