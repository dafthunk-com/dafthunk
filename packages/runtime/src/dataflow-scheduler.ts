import type { ExecutionGraph } from "./execution-graph";
import type { PendingEvent } from "./execution-report";
import { applyNodeResult } from "./execution-state";
import type { ExecutionState, NodeExecutionResult } from "./execution-types";

type PendingResult = Extract<NodeExecutionResult, { status: "pending" }>;

/** What the scheduler needs from its host to actually do anything. */
export interface DataflowHooks {
  /** Runs a node to completion, or to the point where it parks on an event. */
  runNode(nodeId: string): Promise<NodeExecutionResult>;
  /** Waits for a parked node's event and turns it into a final result. */
  resolvePending(pending: PendingResult): Promise<NodeExecutionResult>;
  /** Called after every state change, with the nodes currently parked. */
  onProgress(pendingNodes: ReadonlyMap<string, PendingEvent>): Promise<void>;
}

/**
 * Executes a workflow's nodes using dependency-driven (dataflow) scheduling,
 * applying each result to `state` as it settles.
 *
 * A node starts as soon as *its own* direct upstream nodes have settled
 * (completed, skipped, or errored) — not when some whole topological level is
 * ready. That keeps independent branches decoupled: a node parked on an
 * external event, such as a human-in-the-loop form or an async agent, holds
 * back only its own descendants and never an unrelated branch.
 *
 * Determinism for durable replay comes from the host, which issues each node
 * under a stable step name; results are cached by that name regardless of the
 * order in which nodes happen to finish.
 */
export async function executeDataflow(
  graph: ExecutionGraph,
  state: ExecutionState,
  hooks: DataflowHooks
): Promise<void> {
  const settled = new Set<string>(); // executed ∪ skipped ∪ errored
  const started = new Set<string>();
  const inFlight = new Map<
    string,
    Promise<{ nodeId: string; result: NodeExecutionResult }>
  >();
  const pendingNodes = new Map<string, PendingEvent>();

  const isReady = (nodeId: string): boolean => {
    if (started.has(nodeId)) return false;
    for (const upstream of graph.dependencies(nodeId)) {
      if (!settled.has(upstream)) return false;
    }
    return true;
  };

  const startNode = (nodeId: string): void => {
    started.add(nodeId);
    inFlight.set(
      nodeId,
      (async () => {
        const initial = await hooks.runNode(nodeId);
        if (initial.status !== "pending") {
          return { nodeId, result: initial };
        }

        // Parked on an external event. Surface it, then resume when the event
        // arrives — without blocking any other branch. Applying the pending
        // result records the node's inputs; its outputs come later.
        applyNodeResult(state, initial);
        pendingNodes.set(nodeId, {
          type: initial.eventType,
          timeout: initial.timeout,
        });
        await hooks.onProgress(pendingNodes);

        const resolved = await hooks.resolvePending(initial);
        pendingNodes.delete(nodeId);
        return { nodeId, result: resolved };
      })()
    );
  };

  const scheduleReady = (): void => {
    for (const nodeId of graph.nodeIds) {
      if (isReady(nodeId)) startNode(nodeId);
    }
  };

  scheduleReady();

  while (inFlight.size > 0) {
    const { nodeId, result } = await Promise.race(inFlight.values());
    inFlight.delete(nodeId);

    applyNodeResult(state, result);
    settled.add(nodeId);

    // A settled node may unblock downstream nodes — launch them now.
    scheduleReady();

    await hooks.onProgress(pendingNodes);
  }
}
