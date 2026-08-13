import type {
  BriefDestination,
  CloudflareModelInfo,
  NodeType,
  WorkflowTrigger,
} from "@dafthunk/types";
import { eq } from "drizzle-orm";
import type { Bindings } from "../../context";
import { createDatabase, getIntegrations } from "../../db";
import { users } from "../../db/schema";
import { fetchCloudflareModelCatalog } from "../../runtime/cloudflare-model-catalog";
import { CloudflareNodeRegistry } from "../../runtime/cloudflare-node-registry";
import { availableIntegrationProviders } from "../../services/integration-availability";
import type { CandidateSelection } from "./catalog-selection";
import { selectCandidates } from "./catalog-selection";
import { achievableDestinations } from "./destinations";
import { filterEligible } from "./eligibility";
import type { GroundingContext } from "./grounding";
import { buildGroundingContext } from "./grounding";
import type { OrgResources } from "./org-resources";
import { loadOrgResources, offerableResources } from "./org-resources";

/**
 * What can be built here, right now, for this organization.
 *
 * Both turns are held to this same picture, and that is the entire point. The
 * brief may only read back a sentence the pipeline can deliver on, so the set
 * of destinations the sentence offers and the set of node types the graph is
 * composed from have to come from one place. They used to come from two: the
 * host filtered the catalog to work out which destinations were achievable,
 * and the pipeline filtered it again to work out which node types to show the
 * model. The two agreed only because both call sites were written to agree,
 * and the comment above the first one said so.
 *
 * Split in two on purpose. `createWorkspace` is pure and takes facts already in
 * hand, which is what lets a unit test build one out of fixtures; `loadWorkspace`
 * is the front door that reads those facts out of D1, the registry and the model
 * catalog. Nothing here decides whether generation is *allowed* — credits, the
 * gateway configuration and rate limits stay with the host, because they are
 * answers about the account rather than about what it could build.
 */

/** Everything a workspace is assembled from. Only `nodeTypes` is mandatory. */
export interface WorkspaceFacts {
  /** Live registry types; never a hardcoded snapshot. */
  nodeTypes: NodeType[];
  /** OAuth providers the org has actually connected. */
  connectedProviders?: ReadonlySet<string>;
  /**
   * Providers this deployment can offer OAuth for. A provider that is
   * available but unconnected is still offered (its steps rehearse until the
   * account is linked); one absent here is withheld outright. Absent means
   * every provider is available.
   */
  availableProviders?: ReadonlySet<string>;
  /**
   * Connected integrations by provider — auto-bound onto `integration` inputs
   * at hydration, so a generated Gmail node arrives wired to the account the
   * org already linked. Providers absent here stay unbound.
   */
  integrationsByProvider?: ReadonlyMap<string, { id: string; name: string }>;
  /** What the org owns, for node inputs holding a resource id. */
  orgResources?: OrgResources;
  /** Live Workers AI catalog, best-effort; static descriptions without it. */
  modelCatalog?: CloudflareModelInfo[];
  /** Address that `send-email` delivers to; the model never sees it. */
  ownerEmail?: string;
  /** Composes mailbox addresses for the grounding context. */
  emailDomain?: string;
}

export interface Workspace {
  readonly nodeTypes: NodeType[];
  readonly orgResources: OrgResources;
  readonly connectedProviders: ReadonlySet<string>;
  readonly availableProviders: ReadonlySet<string> | undefined;
  readonly integrationsByProvider: ReadonlyMap<
    string,
    { id: string; name: string }
  >;
  readonly ownerEmail: string | undefined;
  /** The same facts assembled for prompts: entity purposes + instances. */
  readonly grounding: GroundingContext;
  /**
   * Where a result could actually end up, for a workflow starting this way.
   *
   * Trigger-dependent because a responder only exists for the triggers that
   * have one — which is why this is a question and not a field.
   */
  destinations(trigger: WorkflowTrigger): BriefDestination[];
  /**
   * The node types the model may see for this request, plus what was withheld
   * and why. `required` forces the promised destination's types in regardless
   * of how they score.
   */
  candidates(query: string, required?: readonly string[]): CandidateSelection;
}

export function createWorkspace(facts: WorkspaceFacts): Workspace {
  const orgResources = facts.orgResources ?? {};
  const connectedProviders = facts.connectedProviders ?? new Set<string>();
  const integrationsByProvider =
    facts.integrationsByProvider ??
    new Map<string, { id: string; name: string }>();

  /**
   * Which resource families a node may be offered for.
   *
   * Absent `orgResources` is not the same as empty. Empty says the org owns
   * nothing, and the creatable families are still on offer because the run can
   * bring one into being. Absent says nobody looked — a harness that never
   * supplied them — and nothing is offered, so a node needing a component is
   * withheld rather than promised against a component nobody can produce.
   */
  const offerable = facts.orgResources
    ? offerableResources(facts.orgResources)
    : new Set<string>();

  /**
   * Built once, because every prompt in both turns needs it and three call
   * sites had already drifted into keeping identical copies.
   */
  const grounding = buildGroundingContext({
    nodeTypes: facts.nodeTypes,
    orgResources,
    emailDomain: facts.emailDomain,
    modelCatalog: facts.modelCatalog,
  });

  /**
   * The arguments both questions are asked with.
   *
   * The point of holding them here is that there is now one statement of what
   * this org may use, rather than two call sites written to agree. Neither
   * answer is cached: `candidates` marks the withheld entries it found relevant
   * to the query, so handing a second query the first one's findings would
   * report a capability as missing for a request that never asked for it.
   */
  const usable = {
    connectedProviders,
    availableProviders: facts.availableProviders,
  };

  return {
    nodeTypes: facts.nodeTypes,
    orgResources,
    connectedProviders,
    availableProviders: facts.availableProviders,
    integrationsByProvider,
    ownerEmail: facts.ownerEmail,
    grounding,

    destinations(trigger) {
      const { eligible } = filterEligible(facts.nodeTypes, {
        ...usable,
        offerableResources: offerable,
      });
      return achievableDestinations({
        eligible,
        trigger,
        availableProviders: facts.availableProviders,
        nodeTypes: facts.nodeTypes,
        connectedProviders,
      });
    },

    candidates(query, required = []) {
      return selectCandidates(query, facts.nodeTypes, {
        ...usable,
        offerable,
        required,
        modelCatalog: facts.modelCatalog,
      });
    },
  };
}

export interface LoadWorkspaceInput {
  env: Bindings;
  organizationId: string;
  /** Whose address `send-email` falls back to. */
  userId: string;
  developerMode?: boolean;
  /** Lets the model-catalog fetch outlive the request that warmed it. */
  waitUntil?: (promise: Promise<unknown>) => void;
}

/**
 * Reads the workspace out of D1, the registry and the model catalog.
 *
 * Every read but the registry is best-effort. None of them is worth failing a
 * generation over: without the org's components the nodes that need one are
 * simply withheld, without the address the destination contract has nothing to
 * pin, and without the live catalog the hand-written model descriptions stand
 * — which is exactly what shipped before any of them existed.
 */
export async function loadWorkspace(
  input: LoadWorkspaceInput
): Promise<Workspace> {
  const { env, organizationId, userId } = input;
  const db = createDatabase(env.DB);
  const registry = new CloudflareNodeRegistry(
    env,
    input.developerMode ?? false
  );

  const [integrations, orgResources, ownerEmail, modelCatalog] =
    await Promise.all([
      getIntegrations(db, organizationId).catch((error) => {
        console.error(
          "[WorkflowGenerator] could not read integrations:",
          error
        );
        return [];
      }),
      loadOrgResources(db, organizationId).catch((error) => {
        console.error(
          "[WorkflowGenerator] could not read org resources:",
          error
        );
        return {} as OrgResources;
      }),
      readOwnerEmail(db, userId),
      fetchCloudflareModelCatalog(env, {
        waitUntil: input.waitUntil ?? (() => {}),
      }).catch((error) => {
        console.warn(
          "[WorkflowGenerator] model catalog unavailable, using static descriptions:",
          error instanceof Error ? error.message : error
        );
        return [] as CloudflareModelInfo[];
      }),
    ]);

  const integrationsByProvider = bindableIntegrations(integrations);

  return createWorkspace({
    nodeTypes: registry.getNodeTypes() as NodeType[],
    orgResources,
    modelCatalog,
    ownerEmail,
    emailDomain: env.EMAIL_DOMAIN,
    integrationsByProvider,
    // Derived from the same map so "connected" and "bindable" cannot drift.
    connectedProviders: new Set(integrationsByProvider.keys()),
    availableProviders: new Set(availableIntegrationProviders(env)),
  });
}

/**
 * The address `send-email` delivers to.
 *
 * Read while the graph is being built rather than at execution: `NodeContext`
 * carries no user identity, so the recipient has to be baked into the node.
 */
async function readOwnerEmail(
  db: ReturnType<typeof createDatabase>,
  userId: string
): Promise<string | undefined> {
  try {
    const [row] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId));
    return row?.email ?? undefined;
  } catch (error) {
    console.error("[WorkflowGenerator] could not read owner email:", error);
    return undefined;
  }
}

/**
 * One integration per provider, for auto-binding onto generated nodes.
 *
 * Active beats expired — an expired one still binds, because reconnecting
 * heals it in place and silently stubbing a step the user believes is live
 * would be worse. Revoked never binds. Newest wins within a rank, and the
 * editor's integration field lets the user swap the choice.
 */
function bindableIntegrations(
  integrations: Awaited<ReturnType<typeof getIntegrations>>
): ReadonlyMap<string, { id: string; name: string }> {
  const byProvider = new Map<string, { id: string; name: string }>();
  const rank = (status: string) => (status === "active" ? 0 : 1);

  const usable = [...integrations]
    .filter((integration) => integration.status !== "revoked")
    .sort(
      (a, b) =>
        rank(a.status) - rank(b.status) ||
        b.createdAt.getTime() - a.createdAt.getTime()
    );

  for (const integration of usable) {
    if (byProvider.has(integration.provider)) continue;
    byProvider.set(integration.provider, {
      id: integration.id,
      name: integration.name,
    });
  }

  return byProvider;
}
