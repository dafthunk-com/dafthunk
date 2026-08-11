import "@xyflow/react/dist/style.css";

import type {
  NodeExecution,
  NodeType,
  Workflow,
  WorkflowExecution,
} from "@dafthunk/types";
import type {
  Edge as ReactFlowEdge,
  ReactFlowInstance,
  Node as ReactFlowNode,
} from "@xyflow/react";
import { Background, BackgroundVariant, ReactFlow } from "@xyflow/react";
import { useEffect, useMemo, useState } from "react";

import { ActionBarGroup } from "@/components/ui/action-bar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { convertToReactFlowEdges } from "@/services/workflow-service";
import { cn } from "@/utils/utils";

import {
  FIT_VIEW_OPTIONS,
  FitToScreenButton,
  OverviewToggleButton,
} from "./workflow-canvas";
import { WorkflowProvider } from "./workflow-context";
import { WorkflowEdge } from "./workflow-edge";
import { WorkflowNode } from "./workflow-node";
import { WorkflowOverviewNode } from "./workflow-overview-node";
import type {
  NodeExecutionState,
  WorkflowEdgeType,
  WorkflowNodeType,
} from "./workflow-types";

const viewNodeTypes = {
  workflowOverviewNode: WorkflowOverviewNode,
  workflowNode: WorkflowNode,
};

const viewEdgeTypes = {
  workflowEdge: WorkflowEdge,
};

/**
 * The schematic view of a workflow, embeddable anywhere a `Workflow` is in
 * hand.
 *
 * This is the editor's overview — same pill renderer, same edges, same
 * stored positions — as a picture that can be looked around but not
 * changed: the camera is the editor's (pan, zoom, double-click, fit), while
 * dragging, connecting, and selecting stay off. Because it *is* the
 * editor's renderer, what this shows during generation is exactly what
 * opens when the user follows "Open it" into the editor's overview. The
 * editor's view toggle rides along, in the corner the editor keeps it, so
 * the wiring and its properties are one click away here too — still
 * read-only; editing stays in the editor.
 *
 * The graph may still be growing (the generator streams frames): new nodes
 * fade in where they land, kept nodes glide to new positions on a repair
 * (ids persist across attempts), and the camera re-frames each time. With an
 * `execution`, the pills carry its verdict stamps; with `running`, the whole
 * picture pulses gently until the verdicts arrive.
 */
export function WorkflowSchematicView({
  workflow,
  execution,
  running = false,
  nodeTypes,
  view,
  className,
}: {
  workflow: Workflow;
  /** A run's result; stamps each pill with what happened to that step. */
  execution?: WorkflowExecution;
  /** The run is in flight — pulse until the verdicts land. */
  running?: boolean;
  /** For the trigger/responder accent color; omitting renders all-blue. */
  nodeTypes?: NodeType[];
  /**
   * Controlled zoom level. When provided, the page owns the view axis and
   * the embedded toggle disappears; when absent, the view keeps its own
   * toggle and defaults to overview (the brief page's arrangement).
   */
  view?: "overview" | "wiring";
  className?: string;
}) {
  const [instance, setInstance] = useState<ReactFlowInstance<
    ReactFlowNode<WorkflowNodeType>,
    ReactFlowEdge<WorkflowEdgeType>
  > | null>(null);
  const [internalOverview, setInternalOverview] = useState(true);
  const overview = view !== undefined ? view === "overview" : internalOverview;

  const nodes = useMemo<ReactFlowNode<WorkflowNodeType>[]>(() => {
    const verdicts = new Map<string, NodeExecution>(
      (execution?.nodeExecutions ?? []).map((entry) => [entry.nodeId, entry])
    );
    return workflow.nodes.map((node) => ({
      id: node.id,
      type: overview ? "workflowOverviewNode" : "workflowNode",
      position: node.position,
      data: {
        name: node.name,
        icon: node.icon,
        nodeType: node.type,
        // Handle ids are parameter names — both renderers attach edges to
        // handles named after the parameters they carry.
        inputs: node.inputs.map((input) => ({ ...input, id: input.name })),
        outputs: node.outputs.map((output) => ({ ...output, id: output.name })),
        executionState: (verdicts.get(node.id)?.status ??
          "idle") as NodeExecutionState,
      },
    }));
  }, [workflow, execution, overview]);

  // The detail cards read connectedness from these to draw wired handles;
  // they carry no data, so the narrower type is honest.
  const edges = useMemo<ReactFlowEdge<WorkflowEdgeType>[]>(
    () =>
      [
        ...convertToReactFlowEdges(workflow.edges),
      ] as ReactFlowEdge<WorkflowEdgeType>[],
    [workflow]
  );

  // Camera control is inherently imperative: each streamed frame can add
  // nodes or move kept ones, and a view toggle swaps every node's renderer —
  // either way fitView must wait out two frames (React commit, then React
  // Flow re-measure) before re-framing.
  useEffect(() => {
    if (!instance) return;
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        instance.fitView({ ...FIT_VIEW_OPTIONS, duration: 300 });
      })
    );
    return () => cancelAnimationFrame(frame);
  }, [instance, nodes]);

  return (
    <div className={cn("relative", className)}>
      <WorkflowProvider disabled nodeTypes={nodeTypes} edges={edges}>
        <TooltipProvider>
          {/* The picture is a labelled image; the buttons live outside it so
              a role="img" subtree doesn't swallow them for screen readers. */}
          <div
            className="h-full"
            role="img"
            aria-label={`The workflow's ${workflow.nodes.length} steps, in the order they run`}
          >
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={viewNodeTypes}
              edgeTypes={viewEdgeTypes}
              onInit={setInstance}
              fitView
              fitViewOptions={FIT_VIEW_OPTIONS}
              minZoom={0.05}
              maxZoom={4}
              nodesDraggable={false}
              nodesConnectable={false}
              nodesFocusable={false}
              edgesFocusable={false}
              elementsSelectable={false}
              className={cn(
                // The editor's surface, verbatim — this view's whole promise is
                // that it is the same place the workflow opens in.
                "bg-neutral-100/50",
                // Entry and morph: a node that appears fades in where it lands; a
                // node that survives a repair glides to its new place.
                "[&_.react-flow__node]:transition-transform [&_.react-flow__node]:duration-500",
                "[&_.react-flow__node]:animate-in [&_.react-flow__node]:fade-in-0 motion-reduce:[&_.react-flow__node]:animate-none",
                running &&
                  "[&_.react-flow__node]:animate-pulse motion-reduce:[&_.react-flow__node]:animate-none"
              )}
            >
              <Background
                variant={BackgroundVariant.Dots}
                gap={12}
                size={1}
                className="stroke-foreground/5 opacity-50"
              />
            </ReactFlow>
          </div>

          {/* The editor's view controls, in the editor's corner. The toggle
              yields when the page owns the view axis. */}
          <div className="absolute left-4 top-4 z-10 flex flex-col items-start gap-2">
            <ActionBarGroup vertical>
              {view === undefined && (
                <OverviewToggleButton
                  overview={overview}
                  onClick={() => setInternalOverview((current) => !current)}
                />
              )}
              <FitToScreenButton
                onClick={() =>
                  instance?.fitView({ ...FIT_VIEW_OPTIONS, duration: 200 })
                }
              />
            </ActionBarGroup>
          </div>
        </TooltipProvider>
      </WorkflowProvider>
    </div>
  );
}
