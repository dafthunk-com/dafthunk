import type {
  NodeExecution,
  Workflow,
  WorkflowExecution,
} from "@dafthunk/types";
import type { IconName } from "lucide-react/dynamic.mjs";
import { DynamicIcon } from "lucide-react/dynamic.mjs";
import BoxIcon from "lucide-react/icons/box";
import CheckIcon from "lucide-react/icons/check";
import MinusIcon from "lucide-react/icons/minus";
import XIcon from "lucide-react/icons/x";
import { useState } from "react";

import { cn } from "@/utils/utils";

import { layoutWorkflow, NODE_HEIGHT } from "./build-canvas-layout";

/**
 * The workflow, watchable.
 *
 * Rendered from the same `graph` frames the reducer already keeps. Nodes fade
 * in row by row as an attempt lands; a repair morphs the picture rather than
 * replacing it — kept nodes share ids across attempts, so they slide to their
 * new place while new ones enter; the trial run washes a pulse down the rows;
 * and the result stamps each step with what actually happened to it. The point
 * is not the diagram — it is that the minute of waiting becomes a minute of
 * watching the thing get made.
 */
export function BuildCanvas({
  workflow,
  execution,
  running = false,
  className,
}: {
  workflow: Workflow;
  /** The trial run's result; stamps a verdict on every step, row by row. */
  execution?: WorkflowExecution;
  /** The trial run is in flight — wash a pulse down the graph. */
  running?: boolean;
  className?: string;
}) {
  const [width, setWidth] = useState(0);

  // Measurement via ref cleanup rather than an effect. The canvas sits in a
  // fixed max-width column, so this settles immediately and then only moves
  // on a real viewport change.
  const measure = (element: HTMLDivElement | null) => {
    if (!element) return;
    const observer = new ResizeObserver(() => setWidth(element.clientWidth));
    observer.observe(element);
    setWidth(element.clientWidth);
    return () => observer.disconnect();
  };

  const layout = width > 0 ? layoutWorkflow(workflow, width) : undefined;
  const verdicts = new Map<string, NodeExecution>(
    (execution?.nodeExecutions ?? []).map((entry) => [entry.nodeId, entry])
  );

  return (
    <div ref={measure} className={cn("w-full", className)}>
      {layout && (
        <div
          className="relative"
          style={{ height: layout.height }}
          role="img"
          aria-label={`The workflow's ${workflow.nodes.length} steps, in the order they run`}
        >
          <svg
            className="absolute inset-0 overflow-visible"
            width={layout.width}
            height={layout.height}
            aria-hidden="true"
          >
            {layout.edges.map((edge) => (
              <path
                key={edge.id}
                d={edge.path}
                pathLength={1}
                className="fill-none stroke-muted-foreground/30 stroke-[1.5] [stroke-dasharray:1] animate-edge-draw motion-reduce:animate-none"
                style={{ animationDelay: `${edge.row * 120}ms` }}
              />
            ))}
          </svg>

          {layout.nodes.map((node) => {
            const verdict = verdicts.get(node.id);
            // Anything that neither completed nor errored — skipped, or never
            // reached because something upstream failed — reads as "not run".
            const settled =
              verdict?.status === "completed"
                ? "completed"
                : verdict?.status === "error"
                  ? "error"
                  : verdict
                    ? "unrun"
                    : undefined;

            return (
              <div
                key={node.id}
                className={cn(
                  "absolute flex items-center gap-2 rounded-md border bg-card px-2.5 text-xs text-card-foreground shadow-xs",
                  "transition-all animate-in fade-in-0 zoom-in-95 duration-500 [animation-fill-mode:backwards] motion-reduce:animate-none",
                  settled === "error" && "border-red-500/50",
                  settled === "unrun" && "opacity-60"
                )}
                style={{
                  left: node.x,
                  top: node.y,
                  width: node.width,
                  height: NODE_HEIGHT,
                  animationDelay: `${node.row * 120}ms`,
                }}
              >
                {node.icon ? (
                  <DynamicIcon
                    name={node.icon as IconName}
                    className="size-3.5 shrink-0 text-muted-foreground"
                  />
                ) : (
                  <BoxIcon className="size-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className="truncate">{node.name}</span>

                {settled && (
                  <span
                    className={cn(
                      "ml-auto flex size-4 shrink-0 items-center justify-center rounded-full",
                      settled === "completed" &&
                        "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                      settled === "error" &&
                        "bg-red-500/15 text-red-600 dark:text-red-400",
                      settled === "unrun" && "text-muted-foreground",
                      "animate-in fade-in-0 zoom-in-50 duration-300 [animation-fill-mode:backwards] motion-reduce:animate-none"
                    )}
                    // Verdicts land after the nodes and cascade down the rows,
                    // so the result reads as the run flowing through, not as a
                    // table of statuses appearing at once.
                    style={{ animationDelay: `${200 + node.row * 200}ms` }}
                  >
                    {settled === "completed" ? (
                      <CheckIcon className="size-3" />
                    ) : settled === "error" ? (
                      <XIcon className="size-3" />
                    ) : (
                      <MinusIcon className="size-3" />
                    )}
                  </span>
                )}

                {running && !settled && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -inset-px rounded-md border-2 border-primary/40 opacity-0 animate-node-live motion-reduce:hidden"
                    style={{ animationDelay: `${node.row * 300}ms` }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
