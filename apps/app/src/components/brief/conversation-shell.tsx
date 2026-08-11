import type React from "react";

import { cn } from "@/utils/utils";

/**
 * One stage, from the first keystroke to the finished run.
 *
 * The screen is always the same two things on desktop: the conversation in a
 * reading-width rail on the left — request, readback, narration, verdict,
 * next moves — and the workbench on the right, wearing the editor's surface
 * from the start. Screens are states of this stage, not layouts of their
 * own: the canvas sits empty while the request is written, sketches the plan
 * while pieces are chosen, then fills with the graph — nothing ever jumps.
 * The rail scrolls internally; the page does not scroll at all.
 *
 * On small screens the stage is a luxury the viewport can't pay for: the
 * rail is the page, and the canvas pane appears below it only once there is
 * something on it.
 *
 * Shared by the brief page and the workflow page's Describe mode — the same
 * stage, whether the workflow is being born or revised.
 *
 * `banner` carries transport news above whatever screen is showing — it must
 * ride along rather than replace, because a dropped socket is not a change in
 * what the session is doing.
 */
export function ConversationShell({
  banner,
  canvas,
  children,
}: {
  banner?: React.ReactNode;
  /** What is on the workbench; the empty editor surface when omitted. */
  canvas?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col lg:h-full lg:flex-row lg:overflow-hidden">
      <div className="w-full lg:h-full lg:w-[30rem] lg:shrink-0 lg:overflow-y-auto">
        <div className="space-y-6 px-6 py-16 lg:py-12">
          {banner}
          {children}
        </div>
      </div>
      <div
        className={cn(
          canvas ? "block h-72 w-full border-t" : "hidden",
          "lg:block lg:h-full lg:min-w-0 lg:flex-1 lg:border-l lg:border-t-0"
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
