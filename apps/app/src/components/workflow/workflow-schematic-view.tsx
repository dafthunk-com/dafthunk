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

import { convertToReactFlowEdges } from "@/services/workflow-service";
import { cn } from "@/utils/utils";

import { WorkflowProvider } from "./workflow-context";
import { WorkflowEdge } from "./workflow-edge";
import { WorkflowOverviewNode } from "./workflow-overview-node";
import type { NodeExecutionState, WorkflowNodeType } from "./workflow-types";

const viewNodeTypes = {
  workflowOverviewNode: WorkflowOverviewNode,
};

const viewEdgeTypes = {
  workflowEdge: WorkflowEdge,
};

/**
 * The schematic view of a workflow, embeddable anywhere a `Workflow` is in
 * hand.
 *
 * This is the editor's overview — same pill renderer, same edges, same
 * stored positions — as a static picture: no dragging, no zooming, no
 * selection, just fitView keeping the whole graph in frame. Because it *is*
 * the editor's renderer, what this shows during generation is exactly what
 * opens when the user follows "Open it" into the editor's overview.
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
  className,
}: {
  workflow: Workflow;
  /** A run's result; stamps each pill with what happened to that step. */
  execution?: WorkflowExecution;
  /** The run is in flight — pulse until the verdicts land. */
  running?: boolean;
  /** For the trigger/responder accent color; omitting renders all-blue. */
  nodeTypes?: NodeType[];
  className?: string;
}) {
  const [instance, setInstance] = useState<ReactFlowInstance<
    ReactFlowNode<WorkflowNodeType>,
    ReactFlowEdge
  > | null>(null);

  const nodes = useMemo<ReactFlowNode<WorkflowNodeType>[]>(() => {
    const verdicts = new Map<string, NodeExecution>(
      (execution?.nodeExecutions ?? []).map((entry) => [entry.nodeId, entry])
    );
    return workflow.nodes.map((node) => ({
      id: node.id,
      type: "workflowOverviewNode",
      position: node.position,
      data: {
        name: node.name,
        icon: node.icon,
        nodeType: node.type,
        // Handle ids are parameter names — the pill renders an invisible
        // handle per parameter so the edges have something to attach to.
        inputs: node.inputs.map((input) => ({ ...input, id: input.name })),
        outputs: node.outputs.map((output) => ({ ...output, id: output.name })),
        executionState: (verdicts.get(node.id)?.status ??
          "idle") as NodeExecutionState,
      },
    }));
  }, [workflow, execution]);

  const edges = useMemo<ReactFlowEdge[]>(
    () => [...convertToReactFlowEdges(workflow.edges)],
    [workflow]
  );

  // Camera control is inherently imperative: each streamed frame can add
  // nodes or move kept ones, and fitView must wait out two frames — one for
  // React to commit, one for React Flow to measure — before re-framing.
  useEffect(() => {
    if (!instance) return;
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        instance.fitView({ padding: 0.1, maxZoom: 1, duration: 300 });
      })
    );
    return () => cancelAnimationFrame(frame);
  }, [instance, nodes]);

  return (
    <div
      className={cn("relative", className)}
      role="img"
      aria-label={`The workflow's ${workflow.nodes.length} steps, in the order they run`}
    >
      <WorkflowProvider disabled nodeTypes={nodeTypes}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={viewNodeTypes}
          edgeTypes={viewEdgeTypes}
          onInit={setInstance}
          fitView
          fitViewOptions={{ padding: 0.1, maxZoom: 1 }}
          minZoom={0.05}
          maxZoom={1}
          nodesDraggable={false}
          nodesConnectable={false}
          nodesFocusable={false}
          edgesFocusable={false}
          elementsSelectable={false}
          panOnDrag={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          preventScrolling={false}
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
      </WorkflowProvider>
    </div>
  );
}
