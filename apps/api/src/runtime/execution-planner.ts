import type { Workflow } from "@dafthunk/types";

import type { CloudflareNodeRegistry } from "../nodes/cloudflare-node-registry";
import type { ExecutionPlan } from "./runtime";

/**
 * Creates execution plans for workflows by analyzing the node graph.
 * Handles topological ordering and groups consecutive inlinable nodes together.
 */
export class ExecutionPlanner {
  constructor(private nodeRegistry: CloudflareNodeRegistry) {}

  /**
   * Creates an execution plan that groups consecutive inlinable nodes together.
   * Enhanced version that can handle branching patterns within groups.
   *
   * Examples of patterns that can now be inlined:
   *
   * Fan-out pattern:
   *   A → B
   *   A → C     [A, B, C] can be grouped together
   *
   * Fan-in pattern:
   *   A → C
   *   B → C     [A, B, C] can be grouped together
   *
   * Tree pattern:
   *   A → B → D
   *   A → C → D  [A, B, C, D] can be grouped together
   *
   * The old linear approach would have executed these as separate steps,
   * but now they execute in a single Cloudflare workflow step.
   */
  createExecutionPlan(
    workflow: Workflow,
    orderedNodes: string[]
  ): ExecutionPlan {
    const plan: ExecutionPlan = [];
    const processedNodes = new Set<string>();
    let totalInlineGroups = 0;
    let totalInlinedNodes = 0;

    for (let i = 0; i < orderedNodes.length; i++) {
      const nodeId = orderedNodes[i];

      if (processedNodes.has(nodeId)) {
        continue; // Already processed in a group
      }

      const node = workflow.nodes.find((n) => n.id === nodeId);
      if (!node) continue;

      const nodeType = this.nodeRegistry.getNodeType(node.type);
      const isInlinable = nodeType.inlinable ?? false;

      if (isInlinable) {
        // Look ahead to find a group of connected inlinable nodes
        const inlineGroup = this.findConnectedInlinableGroup(
          workflow,
          nodeId,
          orderedNodes,
          i,
          processedNodes
        );

        if (inlineGroup.length === 1) {
          // Single node - add as individual
          plan.push({ type: "individual", nodeId: inlineGroup[0] });
        } else {
          // Multiple nodes - add as inline group
          plan.push({ type: "inline", nodeIds: [...inlineGroup] });
          totalInlineGroups++;
          totalInlinedNodes += inlineGroup.length;
        }

        // Mark all nodes in the group as processed
        inlineGroup.forEach((id) => processedNodes.add(id));
      } else {
        // Non-inlinable node - add as individual
        plan.push({ type: "individual", nodeId });
        processedNodes.add(nodeId);
      }
    }

    // Log metrics for performance analysis
    if (totalInlineGroups > 0) {
      const totalInlinableNodes = orderedNodes.filter((nodeId) => {
        const node = workflow.nodes.find((n) => n.id === nodeId);
        if (!node) return false;
        const nodeType = this.nodeRegistry.getNodeType(node.type);
        return nodeType.inlinable ?? false;
      }).length;

      const inliningEfficiency =
        (totalInlinedNodes / totalInlinableNodes) * 100;
      console.log(
        `Execution plan optimized: ${totalInlineGroups} inline groups containing ${totalInlinedNodes}/${totalInlinableNodes} inlinable nodes (${inliningEfficiency.toFixed(1)}% efficiency)`
      );

      // Log individual group sizes for analysis
      const groupSizes = plan
        .filter((unit) => unit.type === "inline")
        .map((unit) => (unit.type === "inline" ? unit.nodeIds.length : 0));

      console.log(`Group sizes: [${groupSizes.join(", ")}]`);
    }

    return plan;
  }

  /**
   * Finds a connected group of inlinable nodes starting from a given node.
   * Uses a simple algorithm: expand the group as long as all dependencies are satisfied.
   */
  private findConnectedInlinableGroup(
    workflow: Workflow,
    startNodeId: string,
    orderedNodes: string[],
    startIndex: number,
    alreadyProcessed: Set<string>
  ): string[] {
    const group = [startNodeId];
    const groupSet = new Set([startNodeId]);

    // Look ahead in the topological order for nodes that can be added to this group
    for (let i = startIndex + 1; i < orderedNodes.length; i++) {
      const candidateId = orderedNodes[i];

      // Skip if already processed or not inlinable
      if (alreadyProcessed.has(candidateId)) continue;

      const candidateNode = workflow.nodes.find((n) => n.id === candidateId);
      if (!candidateNode) continue;

      const candidateNodeType = this.nodeRegistry.getNodeType(
        candidateNode.type
      );
      if (!(candidateNodeType.inlinable ?? false)) continue;

      // Check if this candidate can be safely added to the group
      if (
        this.canSafelyAddToGroup(
          workflow,
          candidateId,
          groupSet,
          orderedNodes,
          startIndex
        )
      ) {
        group.push(candidateId);
        groupSet.add(candidateId);
      }
    }

    return group;
  }

  /**
   * Simplified check: a node can be added to a group if all its dependencies
   * are either already executed or in the current group.
   */
  private canSafelyAddToGroup(
    workflow: Workflow,
    nodeId: string,
    currentGroupSet: Set<string>,
    orderedNodes: string[],
    groupStartIndex: number
  ): boolean {
    // Get all dependencies of this node
    const dependencies = workflow.edges
      .filter((edge) => edge.target === nodeId)
      .map((edge) => edge.source);

    // Check each dependency
    for (const depId of dependencies) {
      const isInGroup = currentGroupSet.has(depId);
      const depIndex = orderedNodes.indexOf(depId);
      const isAlreadyExecuted = depIndex < groupStartIndex;

      if (!isInGroup && !isAlreadyExecuted) {
        return false; // Has unmet dependency
      }
    }

    return true;
  }

  /**
   * Calculates a topological ordering of nodes. Returns an empty array if a cycle is detected.
   */
  createTopologicalOrder(workflow: Workflow): string[] {
    const inDegree: Record<string, number> = {};
    const adjacency: Record<string, string[]> = {};

    for (const node of workflow.nodes) {
      inDegree[node.id] = 0;
      adjacency[node.id] = [];
    }

    for (const edge of workflow.edges) {
      adjacency[edge.source].push(edge.target);
      inDegree[edge.target] += 1;
    }

    const queue: string[] = Object.keys(inDegree).filter(
      (id) => inDegree[id] === 0
    );
    const ordered: string[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      ordered.push(current);

      for (const neighbour of adjacency[current]) {
        inDegree[neighbour] -= 1;
        if (inDegree[neighbour] === 0) {
          queue.push(neighbour);
        }
      }
    }

    // If ordering missed nodes, a cycle exists.
    return ordered.length === workflow.nodes.length ? ordered : [];
  }
}
