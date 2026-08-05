import type { ParameterType } from "@dafthunk/types";

import type { createDatabase } from "../../db";
import {
  getBots,
  getDatabases,
  getDatasets,
  getEmails,
  getQueues,
} from "../../db/queries";

/**
 * What the organization already owns, for the node types that reference it.
 *
 * A node input typed `database` holds an id, not a value. The model cannot
 * invent one and has no list to pick from, so every such node used to be
 * withheld outright — which quietly removed whole categories (databases,
 * datasets, queues, mailboxes, bots) from anything the generator could build.
 *
 * The split below is the important part, and it is about safety rather than
 * tidiness. See `BINDABLE_RESOURCE_TYPES`.
 */

/** Resource-referencing input types, as they appear on a `Parameter`. */
export type OrgResourceType = Extract<
  ParameterType["type"],
  | "database"
  | "dataset"
  | "queue"
  | "email"
  | "slack"
  | "discord"
  | "telegram"
  | "whatsapp"
>;

/** One thing the org owns, reduced to what binding and explaining need. */
export interface OrgResource {
  id: string;
  name: string;
}

export type OrgResources = Partial<Record<OrgResourceType, OrgResource[]>>;

/**
 * Resource types a generated workflow may bind on the user's behalf.
 *
 * Deliberately only the passive ones. `hydrate.disarm` blanks `queue`, `email`
 * and the four bot types because `WorkflowStore.syncTriggers` marks a saved
 * trigger `active`, and `workflows.enabled` defaults to true — so binding one
 * would arm a live trigger the moment the generator saved, and an unreviewed
 * workflow would start consuming the org's real Slack or Telegram traffic.
 *
 * A database or a dataset does nothing until a node reads it, so there is
 * nothing to arm and nothing to review first.
 */
export const BINDABLE_RESOURCE_TYPES: ReadonlySet<OrgResourceType> =
  new Set<OrgResourceType>(["database", "dataset"]);

/** How to tell someone to get the resource they turned out to need. */
const RESOURCE_ADVICE: Record<OrgResourceType, string> = {
  database: "create one under Databases",
  dataset: "create one under Datasets",
  queue: "create one under Queues",
  email: "set up a mailbox under Emails",
  slack: "add a Slack bot under Bots, then pick it in the editor",
  discord: "add a Discord bot under Bots, then pick it in the editor",
  telegram: "add a Telegram bot under Bots, then pick it in the editor",
  whatsapp: "add a WhatsApp bot under Bots, then pick it in the editor",
};

/** A human name for a resource type, for the same sentence. */
const RESOURCE_NOUN: Record<OrgResourceType, string> = {
  database: "database",
  dataset: "dataset",
  queue: "queue",
  email: "mailbox",
  slack: "Slack bot",
  discord: "Discord bot",
  telegram: "Telegram bot",
  whatsapp: "WhatsApp bot",
};

/**
 * One sentence explaining a capability the request needed and could not have.
 *
 * Says which of the two situations it is, because they have opposite fixes:
 * owning none of something means go and make one, whereas owning one that
 * cannot be bound automatically means open the workflow and choose it.
 */
export function describeMissingResource(
  type: OrgResourceType,
  owned: number
): string {
  const noun = RESOURCE_NOUN[type];
  if (owned === 0) {
    return `Some steps needed a ${noun}, and this workspace has none — ${RESOURCE_ADVICE[type]}.`;
  }
  return `Some steps needed a ${noun}. I left it unset so nothing starts running before you have looked at it — open the workflow and choose one.`;
}

/**
 * Everything the org owns across every resource-referencing type.
 *
 * Bots are stored in one table keyed by provider, so they are read once and
 * split, rather than queried four times.
 */
export async function loadOrgResources(
  db: ReturnType<typeof createDatabase>,
  organizationId: string
): Promise<OrgResources> {
  const [databases, datasets, queues, emails, allBots] = await Promise.all([
    getDatabases(db, organizationId),
    getDatasets(db, organizationId),
    getQueues(db, organizationId),
    getEmails(db, organizationId),
    getBots(db, organizationId),
  ]);

  // Oldest first, so `resourceToBind` is deterministic across runs rather than
  // dependent on whatever order the rows came back in.
  const named = (
    rows: Array<{ id: string; name: string; createdAt: Date | null }>
  ): OrgResource[] =>
    [...rows]
      .sort(
        (a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0)
      )
      .map((row) => ({ id: row.id, name: row.name }));

  const byProvider = (provider: string): OrgResource[] =>
    named(allBots.filter((bot) => bot.provider === provider));

  return {
    database: named(databases),
    dataset: named(datasets),
    queue: named(queues),
    email: named(emails),
    slack: byProvider("slack"),
    discord: byProvider("discord"),
    telegram: byProvider("telegram"),
    whatsapp: byProvider("whatsapp"),
  };
}

/**
 * The resource types a node can actually be given, for this org.
 *
 * Used by eligibility: a node referencing something outside this set would
 * produce a graph with a dangling id, which is a red run rather than a
 * workflow.
 */
export function bindableResources(
  resources: OrgResources
): ReadonlySet<OrgResourceType> {
  const usable = new Set<OrgResourceType>();
  for (const type of BINDABLE_RESOURCE_TYPES) {
    if ((resources[type]?.length ?? 0) > 0) usable.add(type);
  }
  return usable;
}

/**
 * The resource to bind for a type.
 *
 * Picks the oldest when the org owns several — it is the one most likely to be
 * their real, populated database rather than something made while
 * experimenting. Choosing is better than refusing here, but only because the
 * choice is always reported back: `boundResourceNote` puts the name on screen,
 * so a wrong guess is visible rather than a silent write to the wrong place.
 */
export function resourceToBind(
  resources: OrgResources,
  type: OrgResourceType
): OrgResource | undefined {
  return (resources[type] ?? [])[0];
}

/** What to tell the user about a binding we made for them. */
export function boundResourceNote(
  type: OrgResourceType,
  resource: OrgResource
): string {
  return `Used your ${RESOURCE_NOUN[type]} "${resource.name}".`;
}
