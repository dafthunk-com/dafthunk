import type { NodeType, Parameter } from "@dafthunk/types";

/**
 * Parameter types that reference a resource the org must already have created.
 *
 * A generated workflow cannot invent one. Whether a node needing one is usable
 * depends on the org owning at least one, or the generator being able to
 * create one — see `offerableResources` in org-resources.ts.
 */
const ORG_RESOURCE_TYPES: ReadonlySet<string> = new Set([
  "database",
  "dataset",
  "queue",
  "email",
  "schema",
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

/**
 * The AI nodes the generator may reach for — one per capability, chosen for
 * what it can do rather than what it costs.
 *
 * Thirty-six node types carry the `AI` tag, and offering all of them does not
 * give the model a choice so much as a lottery: selection is keyword scoring
 * against descriptions, so a request lands on `gpt-5-mini` or `gemini-2-5-flash`
 * because the words matched, not because either suited the work. An evaluation
 * run picked three different providers across seven cases for no reason anyone
 * could state. Naming one per capability turns an accident into a decision, and
 * takes thirty entries out of the prompt.
 *
 * Quality first, deliberately. Someone who wants the cheap model can pick it in
 * the editor, where the trade is visible and theirs to make; someone reading a
 * generated workflow for the first time is judging whether the product works.
 *
 * Everything AI-tagged and unnamed here is withheld, so a newly registered model
 * stays out until it is chosen on purpose. That is the safe direction for a
 * curated list — the failure is a missing option, not a silent downgrade.
 */
const OFFERED_AI_TYPES: ReadonlySet<string> = new Set([
  // Text generation and the tool loop, which are the same node: an agent with
  // no tools is a text generator, and it is the one model measured to stop when
  // it is done rather than when its budget does. Opus over Sonnet is the
  // quality-first read of the same rule the rest of this list follows: the
  // cheaper tier is the one someone picks in the editor, where the trade is
  // visible and theirs to make.
  "agent-claude-opus-5",
  // Curated Workers AI stand-ins. No Anthropic model replaces either, and they
  // need no credentials, which keeps image and audio workflows runnable.
  "ai-image",
  "ai-transcribe",
  // Understanding and speech, where the pro tier is the better answer and the
  // flash variants exist only to be cheaper.
  "gemini-2-5-pro-image-understanding",
  "gemini-2-5-pro-audio-understanding",
  "gemini-2-5-flash-tts",
  // Retrieval over an org's own data. Tagged `AI` but not a model choice, so
  // withholding them would remove a capability rather than narrow one.
  "dataset-ai-search",
  "dataset-search",
]);

/**
 * Withheld silently rather than reported, like the pseudo-type replacements
 * above. "Relevant but unavailable" exists to tell someone a capability needs
 * connecting; here the capability is present and a better node covers it, so
 * naming the runner-up would only invite them to ask for it.
 */
function isUnofferedModel(nodeType: NodeType): boolean {
  return (
    (nodeType.tags?.includes("AI") ?? false) &&
    !OFFERED_AI_TYPES.has(nodeType.type)
  );
}

export interface EligibilityContext {
  /** OAuth providers the org has actually connected. */
  connectedProviders: ReadonlySet<string>;
  /**
   * OAuth providers this deployment can offer at all — the ones with client
   * config. A provider that is available but unconnected is *offered* (its
   * nodes rehearse on stand-in data until the account is linked); a provider
   * missing from this set is withheld outright, because there is nothing the
   * user could connect. Absent means every provider is available.
   */
  availableProviders?: ReadonlySet<string>;
  /**
   * Resource types whose nodes may be offered: owned, or creatable on demand.
   * Absent means none, which is the old behaviour: withhold them all.
   */
  offerableResources?: ReadonlySet<string>;
}

/** The `provider` of every `integration` input a node declares. */
function requiredProviders(nodeType: NodeType): string[] {
  return nodeType.inputs
    .filter((p: Parameter) => p.type === "integration")
    .map((p) => (p as Parameter & { provider?: string }).provider)
    .filter((p): p is string => typeof p === "string");
}

/**
 * The org-scoped resource types a node cannot run without.
 *
 * Required inputs only. An optional resource input — the validation schema on
 * a database query, the structured-output schema on a model node — does not
 * gate the node: it works untouched without one, and withholding every model
 * node from an org that never made a schema would remove capabilities that
 * were never at risk.
 */
function orgResourcesNeeded(nodeType: NodeType): string[] {
  return [
    ...new Set(
      nodeType.inputs
        .filter((p: Parameter) => p.required)
        .map((p: Parameter) => p.type)
        .filter((type) => ORG_RESOURCE_TYPES.has(type))
    ),
  ];
}

export interface Ineligible {
  type: string;
  reason: "integration" | "org-resource";
  /** Set when `reason` is `integration`. */
  provider?: string;
  /** Set when `reason` is `org-resource`: the type that could not be supplied. */
  resource?: string;
  /**
   * Whether this node scored against the request.
   *
   * Everything unusable is withheld, but only a fraction of it has anything to
   * do with what was asked. Telling someone who asked about their database that
   * LinkedIn is not connected is noise; telling someone who asked about blog
   * posts that WordPress is not connected is the answer to their question.
   */
  relevant?: boolean;
}

/**
 * The distinct org resources a request would have needed but could not use.
 *
 * The sibling of `withheldProviders`, and it exists for the same reason: a
 * capability that vanishes without explanation reads as the product not
 * understanding the request. These used to be dropped on the floor entirely.
 */
export function withheldResources(withheld: Ineligible[]): string[] {
  return [
    ...new Set(
      withheld.flatMap((entry) =>
        entry.reason === "org-resource" && entry.resource && entry.relevant
          ? [entry.resource]
          : []
      )
    ),
  ];
}

/** The distinct OAuth providers a request would have needed but cannot use. */
export function withheldProviders(withheld: Ineligible[]): string[] {
  return [
    ...new Set(
      withheld.flatMap((entry) =>
        entry.reason === "integration" && entry.provider && entry.relevant
          ? [entry.provider]
          : []
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
  /**
   * Offered despite an unconnected provider. These nodes rehearse on
   * stand-in data until the account is linked; the caller uses this list to
   * say so instead of pretending the account exists.
   */
  unconnected: Array<{ type: string; provider: string }>;
} {
  const eligible: NodeType[] = [];
  const withheld: Ineligible[] = [];
  const unconnected: Array<{ type: string; provider: string }> = [];
  const { availableProviders } = context;

  for (const nodeType of nodeTypes) {
    if (nodeType.trigger || nodeType.responder) continue;
    if (REPLACED_BY_PSEUDO_TYPES.has(nodeType.type)) continue;
    if (isUnofferedModel(nodeType)) continue;

    const providers = requiredProviders(nodeType);

    // A provider this deployment cannot offer OAuth for is withheld outright:
    // there is nothing the user could connect to make the node run.
    const unavailable = availableProviders
      ? providers.find((p) => !availableProviders.has(p))
      : undefined;
    if (unavailable) {
      withheld.push({
        type: nodeType.type,
        reason: "integration",
        provider: unavailable,
      });
      continue;
    }

    // Unconnected is no longer a reason to withhold: the node is offered, the
    // trial run rehearses it on stand-in data, and the outcome screen offers
    // the connection. Tracked so every consumer can say that honestly.
    const missing = providers.find((p) => !context.connectedProviders.has(p));
    if (missing) {
      unconnected.push({ type: nodeType.type, provider: missing });
    }

    const offerable = context.offerableResources ?? new Set<string>();
    const unsuppliable = orgResourcesNeeded(nodeType).find(
      (resource) => !offerable.has(resource)
    );
    if (unsuppliable) {
      withheld.push({
        type: nodeType.type,
        reason: "org-resource",
        resource: unsuppliable,
      });
      continue;
    }

    eligible.push(nodeType);
  }

  return {
    eligible,
    byType: new Map(eligible.map((nodeType) => [nodeType.type, nodeType])),
    withheld,
    unconnected,
  };
}
