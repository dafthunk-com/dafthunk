import type { Edge, Node, Workflow } from "@dafthunk/types";

const NO_EDGES: readonly Edge[] = [];
const NO_DEPENDENCIES: ReadonlySet<string> = new Set();

/**
 * Immutable, indexed view of a workflow's node graph.
 *
 * The runtime asks the same few questions of a workflow over and over — which
 * edges feed this node, which upstream nodes must settle first, what is this
 * node's definition. Answering them by scanning `workflow.nodes` and
 * `workflow.edges` each time makes progress reporting quadratic in graph size,
 * so every index is built once here.
 *
 * Instances hold Maps and Sets and are therefore **not** JSON-serializable:
 * build one outside any durable step. Construction is a pure function of the
 * workflow, so a replayed execution rebuilds an identical graph.
 */
export class ExecutionGraph {
  private constructor(
    readonly workflow: Workflow,
    /** Node ids in topological order — every node follows its dependencies. */
    readonly nodeIds: readonly string[],
    private readonly nodesById: ReadonlyMap<string, Node>,
    private readonly inboundByTarget: ReadonlyMap<string, readonly Edge[]>,
    private readonly dependenciesByNode: ReadonlyMap<
      string,
      ReadonlySet<string>
    >
  ) {}

  /**
   * Indexes a workflow into an executable graph.
   *
   * @throws if the graph contains a cycle and so has no execution order.
   *   Callers normally run {@link validateWorkflow} first, which reports cycles
   *   as a validation error; this check is the backstop that keeps the
   *   invariant local to the type.
   */
  static build(workflow: Workflow): ExecutionGraph {
    const nodesById = new Map(workflow.nodes.map((node) => [node.id, node]));

    const inboundByTarget = new Map<string, Edge[]>();
    const outboundBySource = new Map<string, Edge[]>();
    const dependenciesByNode = new Map<string, Set<string>>();

    for (const node of workflow.nodes) {
      dependenciesByNode.set(node.id, new Set());
    }

    for (const edge of workflow.edges) {
      pushInto(inboundByTarget, edge.target, edge);
      pushInto(outboundBySource, edge.source, edge);
      dependenciesByNode.get(edge.target)?.add(edge.source);
    }

    return new ExecutionGraph(
      workflow,
      topologicalOrder(workflow, dependenciesByNode, outboundBySource),
      nodesById,
      inboundByTarget,
      dependenciesByNode
    );
  }

  node(nodeId: string): Node | undefined {
    return this.nodesById.get(nodeId);
  }

  /** Edges delivering values into this node. */
  inboundEdges(nodeId: string): readonly Edge[] {
    return this.inboundByTarget.get(nodeId) ?? NO_EDGES;
  }

  /**
   * Distinct upstream nodes that must settle — complete, skip, or error —
   * before this node can be scheduled.
   */
  dependencies(nodeId: string): ReadonlySet<string> {
    return this.dependenciesByNode.get(nodeId) ?? NO_DEPENDENCIES;
  }
}

function pushInto<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const existing = map.get(key);
  if (existing) {
    existing.push(value);
    return;
  }
  map.set(key, [value]);
}

/**
 * Kahn's algorithm. Nodes are seeded and drained in workflow declaration order
 * so the result is deterministic, which durable replay depends on.
 */
function topologicalOrder(
  workflow: Workflow,
  dependenciesByNode: ReadonlyMap<string, ReadonlySet<string>>,
  outboundBySource: ReadonlyMap<string, readonly Edge[]>
): readonly string[] {
  const remaining = new Map<string, number>();
  for (const node of workflow.nodes) {
    remaining.set(node.id, dependenciesByNode.get(node.id)?.size ?? 0);
  }

  const queue = workflow.nodes
    .map((node) => node.id)
    .filter((id) => remaining.get(id) === 0);

  const ordered: string[] = [];
  for (let i = 0; i < queue.length; i++) {
    const nodeId = queue[i];
    ordered.push(nodeId);

    // Distinct targets only: parallel edges between the same pair contribute a
    // single dependency, matching how `dependenciesByNode` counted them.
    const unblocked = new Set(
      (outboundBySource.get(nodeId) ?? NO_EDGES).map((edge) => edge.target)
    );
    for (const target of unblocked) {
      const left = (remaining.get(target) ?? 0) - 1;
      remaining.set(target, left);
      if (left === 0) queue.push(target);
    }
  }

  if (ordered.length !== workflow.nodes.length) {
    throw new Error(
      "Unable to derive execution order. The graph may contain a cycle."
    );
  }

  return ordered;
}
