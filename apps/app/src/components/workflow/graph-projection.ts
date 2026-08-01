import type { ObjectReference } from "@dafthunk/types";
import type {
  Edge as ReactFlowEdge,
  Node as ReactFlowNode,
} from "@xyflow/react";

import type { WorkflowEdgeType, WorkflowNodeType } from "./workflow-types";

/**
 * Reconciling the local graph against the one the server pushes.
 *
 * The persistable projection below is everything that round-trips to the
 * server, and nothing that doesn't.
 *
 * Both change detection (has the user edited anything worth saving?) and
 * remote sync (does the server's graph differ from ours?) read from here, so
 * "meaningfully different" has exactly one definition. Anything session-local
 * is projected away: execution results, transient edge highlighting, selection,
 * and the injected `createObjectUrl` callback. If those leaked into the
 * comparison, every run would look like an edit — which is precisely how
 * remote updates used to wipe execution output off the canvas.
 */

function projectNode(node: ReactFlowNode<WorkflowNodeType>) {
  const { executionState, error, createObjectUrl, ...data } = node.data;
  return {
    id: node.id,
    type: node.type,
    position: node.position,
    data: {
      ...data,
      // Input values are user-authored and persist; output values are
      // execution results and do not.
      outputs: node.data.outputs.map(({ value, ...output }) => output),
    },
  };
}

function projectEdge(edge: ReactFlowEdge<WorkflowEdgeType>) {
  const { isActive, createObjectUrl, ...data } = edge.data ?? {};
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    type: edge.type,
    data,
  };
}

/** Stable fingerprint of the persistable node data. */
export function serializeNodes(
  nodes: ReactFlowNode<WorkflowNodeType>[]
): string {
  return JSON.stringify(nodes.map(projectNode));
}

/** Stable fingerprint of the persistable edge data. */
export function serializeEdges(
  edges: ReactFlowEdge<WorkflowEdgeType>[]
): string {
  return JSON.stringify(edges.map(projectEdge));
}

/**
 * Fold a server push into the current graph.
 *
 * The push is authoritative for structure (which nodes exist, their inputs and
 * positions) but knows nothing about the current session: it carries no
 * execution results, no selection, and no in-flight drag. Those are taken from
 * the node already on screen, so a collaborator's edit cannot blank out the
 * output of a run the user is still looking at.
 */
export function mergeRemoteNodes(
  incoming: ReactFlowNode<WorkflowNodeType>[],
  current: ReactFlowNode<WorkflowNodeType>[],
  createObjectUrl: (objectReference: ObjectReference) => string
): ReactFlowNode<WorkflowNodeType>[] {
  const currentById = new Map(current.map((node) => [node.id, node]));

  return incoming.map((node) => {
    const local = currentById.get(node.id);
    if (!local) {
      return { ...node, data: { ...node.data, createObjectUrl } };
    }

    const localOutputsById = new Map(
      local.data.outputs.map((output) => [output.id, output])
    );

    return {
      ...node,
      selected: local.selected,
      dragging: local.dragging,
      // Preserve the user's active drag position instead of snapping to server state
      ...(local.dragging && { position: local.position }),
      data: {
        ...node.data,
        createObjectUrl,
        executionState: local.data.executionState,
        error: local.data.error,
        outputs: node.data.outputs.map((output) => {
          const localOutput = localOutputsById.get(output.id);
          return localOutput ? { ...output, value: localOutput.value } : output;
        }),
      },
    };
  });
}
