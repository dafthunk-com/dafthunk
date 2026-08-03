import type { NodeType, Parameter } from "@dafthunk/types";

/**
 * Parameter types that reference a resource the org must already have created.
 * A generated workflow cannot invent one, so nodes needing them are withheld.
 */
const ORG_RESOURCE_TYPES: ReadonlySet<string> = new Set([
  "database",
  "dataset",
  "queue",
  "email",
  "discord",
  "telegram",
  "whatsapp",
  "slack",
]);

/** Raw Workers AI nodes are withheld in favour of the curated pseudo types. */
const REPLACED_BY_PSEUDO_TYPES: ReadonlySet<string> = new Set([
  "cloudflare-model",
  "cloudflare-gateway-model",
]);

export interface EligibilityContext {
  /** Non-pro orgs cannot execute `subscription: true` nodes at all. */
  plan: "pro" | "trial";
  /** OAuth providers the org has actually connected. */
  connectedProviders: ReadonlySet<string>;
}

/** The `provider` of every `integration` input a node declares. */
function requiredProviders(nodeType: NodeType): string[] {
  return nodeType.inputs
    .filter((p: Parameter) => p.type === "integration")
    .map((p) => (p as Parameter & { provider?: string }).provider)
    .filter((p): p is string => typeof p === "string");
}

/** True when the node depends on an org-scoped resource id. */
function needsOrgResource(nodeType: NodeType): boolean {
  return nodeType.inputs.some((p: Parameter) => ORG_RESOURCE_TYPES.has(p.type));
}

export interface Ineligible {
  type: string;
  reason: "subscription" | "integration" | "org-resource";
  /** Set when `reason` is `integration`. */
  provider?: string;
}

/** The distinct OAuth providers a request would have needed but cannot use. */
export function withheldProviders(withheld: Ineligible[]): string[] {
  return [
    ...new Set(
      withheld.flatMap((entry) =>
        entry.reason === "integration" && entry.provider ? [entry.provider] : []
      )
    ),
  ];
}

/**
 * Narrows the catalog to node types this org can actually execute right now.
 *
 * The point is not tidiness: a workflow that references a node the org cannot
 * run produces a red first execution, which is the exact failure this feature
 * exists to avoid. Trigger and responder nodes are excluded too, because the
 * server injects those rather than letting the model choose them.
 *
 * Returns the withheld types as well, so the caller can tell the user *why* a
 * capability they asked for is missing instead of silently substituting.
 */
export function filterEligible(
  nodeTypes: NodeType[],
  context: EligibilityContext
): {
  eligible: NodeType[];
  /** Same entries as `eligible`, keyed by type for direct lookup. */
  byType: Map<string, NodeType>;
  withheld: Ineligible[];
} {
  const eligible: NodeType[] = [];
  const withheld: Ineligible[] = [];

  for (const nodeType of nodeTypes) {
    if (nodeType.trigger || nodeType.responder) continue;
    if (REPLACED_BY_PSEUDO_TYPES.has(nodeType.type)) continue;

    if (nodeType.subscription && context.plan !== "pro") {
      withheld.push({ type: nodeType.type, reason: "subscription" });
      continue;
    }

    const providers = requiredProviders(nodeType);
    const missing = providers.find((p) => !context.connectedProviders.has(p));
    if (missing) {
      withheld.push({
        type: nodeType.type,
        reason: "integration",
        provider: missing,
      });
      continue;
    }

    if (needsOrgResource(nodeType)) {
      withheld.push({ type: nodeType.type, reason: "org-resource" });
      continue;
    }

    eligible.push(nodeType);
  }

  return {
    eligible,
    byType: new Map(eligible.map((nodeType) => [nodeType.type, nodeType])),
    withheld,
  };
}
