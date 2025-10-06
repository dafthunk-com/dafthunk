import type { Node } from "@dafthunk/types";

import type { Bindings } from "../context";
import type { CloudflareNodeRegistry } from "../nodes/cloudflare-node-registry";
import { getOrganizationComputeUsage } from "../utils/credits";

/**
 * Manages compute credits for workflow execution.
 * Handles credit checks and cost calculations.
 */
export class CreditManager {
  constructor(
    private env: Bindings,
    private nodeRegistry: CloudflareNodeRegistry
  ) {}

  /**
   * Checks if the organization has enough compute credits to execute a workflow.
   * Credit limits are not enforced in development mode.
   */
  async hasEnoughComputeCredits(
    organizationId: string,
    computeCredits: number,
    computeCost: number
  ): Promise<boolean> {
    // Skip credit limit enforcement in development mode
    if (this.env.CLOUDFLARE_ENV === "development") {
      return true;
    }

    const computeUsage = await getOrganizationComputeUsage(
      this.env.KV,
      organizationId
    );
    return computeUsage + computeCost <= computeCredits;
  }

  /**
   * Returns the compute cost of a list of nodes.
   */
  getNodesComputeCost(nodes: Node[]): number {
    return nodes.reduce((acc, node) => {
      const nodeType = this.nodeRegistry.getNodeType(node.type);
      return acc + (nodeType.computeCost ?? 1);
    }, 0);
  }
}
