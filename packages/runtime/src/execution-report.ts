/**
 * Projects execution state into the `NodeExecution[]` shape that monitoring
 * updates and the persisted execution record both consume.
 *
 * This is a pure read-model: it never mutates state, and it is rebuilt from
 * scratch on every progress update. That makes it a hot path, so all membership
 * lookups are indexed up front rather than scanned per node.
 */

import type { NodeExecution, WorkflowExecutionStatus } from "@dafthunk/types";

import type { ExecutionGraph } from "./execution-graph";
import { getExecutionStatus, inferSkipReason } from "./execution-state";
import type { ExecutionState } from "./execution-types";

/** An external event a node is currently parked on. */
export interface PendingEvent {
  type: string;
  timeout: string;
}

/**
 * Builds one NodeExecution per workflow node, reflecting where each node stands.
 *
 * @param overrideStatus - Terminal status to report against instead of deriving
 *   it from state. Set when the run ended for a reason the state doesn't show
 *   (exhausted credits, a thrown error), which decides whether unreached nodes
 *   read as "executing" or "idle".
 * @param pendingNodes - Nodes parked on an external event, which outranks every
 *   other status because state holds no record of them yet.
 */
export function buildNodeExecutions(
  graph: ExecutionGraph,
  state: ExecutionState,
  overrideStatus?: WorkflowExecutionStatus,
  pendingNodes?: ReadonlyMap<string, PendingEvent>
): NodeExecution[] {
  const executed = new Set(state.executedNodes);
  const skipped = new Set(state.skippedNodes);

  const isStillRunning =
    (overrideStatus ?? getExecutionStatus(graph, state)) === "executing";

  return graph.workflow.nodes.map((node): NodeExecution => {
    const pendingEvent = pendingNodes?.get(node.id);
    if (pendingEvent) {
      return {
        nodeId: node.id,
        status: "pending",
        usage: 0,
        pendingEvent,
      } as NodeExecution;
    }

    if (executed.has(node.id)) {
      return {
        nodeId: node.id,
        status: "completed",
        inputs: state.nodeInputs[node.id] ?? {},
        outputs: state.nodeOutputs[node.id] ?? {},
        usage: state.nodeUsage[node.id] ?? 0,
      } as NodeExecution;
    }

    if (node.id in state.nodeErrors) {
      return {
        nodeId: node.id,
        status: "error",
        inputs: state.nodeInputs[node.id] ?? {},
        error: state.nodeErrors[node.id],
        usage: state.nodeUsage[node.id] ?? 0,
      } as NodeExecution;
    }

    if (skipped.has(node.id)) {
      const { reason, blockedBy } = inferSkipReason(graph, state, node.id);
      return {
        nodeId: node.id,
        status: "skipped",
        outputs: null,
        usage: 0,
        skipReason: reason,
        blockedBy: [...blockedBy],
      } as NodeExecution;
    }

    // Never reached. While the run is live that means "not yet"; once it has
    // settled it means the node was never going to run at all.
    return {
      nodeId: node.id,
      status: isStillRunning ? "executing" : "idle",
      usage: 0,
    } as NodeExecution;
  });
}
