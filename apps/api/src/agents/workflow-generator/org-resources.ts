import type { Field, ParameterType } from "@dafthunk/types";
import { COMPONENT_FAMILIES, RESOURCE_FAMILY_NOUNS } from "@dafthunk/utils";

import type { createDatabase } from "../../db";
import {
  getBots,
  getDatabases,
  getDatasets,
  getEmails,
  getQueues,
  getSchemas,
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
 * tidiness. See `PASSIVE_BINDABLE_TYPES`.
 */

/** Resource-referencing input types, as they appear on a `Parameter`. */
export type OrgResourceType = Extract<
  ParameterType["type"],
  | "database"
  | "dataset"
  | "queue"
  | "email"
  | "schema"
  | "slack"
  | "discord"
  | "telegram"
  | "whatsapp"
>;

/** One thing the org owns, reduced to what binding and explaining need. */
export interface OrgResource {
  id: string;
  name: string;
  /** The instance's own account of itself, when its owner wrote one. */
  description?: string;
  /** Mailboxes only: the address handle, which is how people know them. */
  handle?: string;
  /**
   * Schemas only: the fields, because for a form trigger they are its ports.
   *
   * The odd one out here, and deliberately so. Every other resource is opaque
   * to the graph — a database id binds and the node does the rest — but a form
   * trigger declares no outputs at all: they are derived from the schema it is
   * bound to, the same derivation the editor widget runs when someone picks
   * one. Without the fields, hydration binds the schema and leaves a node with
   * no ports, so every edge drawn off the form is fatal and unfixable, because
   * the repair prompt can only offer "its outputs are: none".
   */
  fields?: Field[];
}

export type OrgResources = Partial<Record<OrgResourceType, OrgResource[]>>;

/**
 * Resource types hydration may bind by falling back on what the org owns.
 *
 * Deliberately only the passive ones. `hydrate.disarm` blanks `queue`, `email`
 * and the four bot types on the trigger node because `WorkflowStore.syncTriggers`
 * marks a saved trigger `active`, and `workflows.enabled` defaults to true — so
 * binding one there would arm a live trigger the moment the generator saved,
 * and an unreviewed workflow would start consuming the org's real Slack or
 * Telegram traffic.
 *
 * A database or a dataset does nothing until a node reads it, so there is
 * nothing to arm and nothing to review first. `schema` was here too and is
 * not: a schema is not a place a node reads from, it is the shape of the
 * node's own ports, so the oldest one is never a defensible default — it makes
 * a form ask for whatever fields an unrelated schema happens to hold. Shapes
 * are resolved per node by the resource resolver instead.
 */
export const PASSIVE_BINDABLE_TYPES: ReadonlySet<OrgResourceType> =
  new Set<OrgResourceType>(["database", "dataset"]);

/**
 * Resource types the generator may create an instance of at generation time.
 *
 * Derived from the family descriptors rather than re-declared: bots stay out
 * because they need external credentials nobody can conjure, and that fact
 * lives in one place.
 */
export const CREATABLE_RESOURCE_TYPES: ReadonlySet<OrgResourceType> = new Set(
  Object.values(COMPONENT_FAMILIES)
    .filter((family) => family.creatable)
    .flatMap((family) => family.parameterTypes as OrgResourceType[])
);

/**
 * Resource types that are a shape rather than a place.
 *
 * The distinction the rest of this module keeps having to restate. An instance
 * of every other family is somewhere — one database IS the database, and it
 * binds once per workflow. A schema is a record shape, and one workflow needs
 * several unrelated ones: what the form asks for, what the model must emit,
 * what the table's columns are. So a shape is written per node rather than
 * chosen from a list, which is why `DraftResource.nodeId` exists and why
 * `PASSIVE_BINDABLE_TYPES` excludes it.
 *
 * Named because the prompts have to draw the same line, and were drawing it by
 * hand: the draft schema's family union listed the eight places and left
 * `schema` out, which read as a family the wire did not accept.
 */
export const SHAPE_RESOURCE_TYPES: ReadonlySet<OrgResourceType> =
  new Set<OrgResourceType>(["schema"]);

/** Resource families that are somewhere a node reads from, writes to or sends to. */
export const PLACE_RESOURCE_TYPES: readonly OrgResourceType[] = (
  Object.keys(RESOURCE_FAMILY_NOUNS) as OrgResourceType[]
).filter((type) => !SHAPE_RESOURCE_TYPES.has(type));

/** Character-for-character the bot descriptor's own parameter types. */
const BOT_RESOURCE_TYPES: ReadonlySet<OrgResourceType> = new Set(
  COMPONENT_FAMILIES.bot.parameterTypes as readonly OrgResourceType[]
);

/**
 * The resource families the generator may offer nodes for.
 *
 * Creatable families are always offerable — a missing instance is a thing the
 * generator can make, not a reason to hide the capability. Bots are offerable
 * only when the org owns one, because nothing can create the credentials.
 */
export function offerableResources(
  resources: OrgResources
): ReadonlySet<OrgResourceType> {
  const usable = new Set<OrgResourceType>(CREATABLE_RESOURCE_TYPES);
  for (const type of BOT_RESOURCE_TYPES) {
    if ((resources[type]?.length ?? 0) > 0) usable.add(type);
  }
  return usable;
}

/** How to tell someone to get the resource they turned out to need. */
const RESOURCE_ADVICE: Record<OrgResourceType, string> = {
  database: "create one under Databases",
  dataset: "create one under Datasets",
  queue: "create one under Queues",
  email: "set up a mailbox under Emails",
  schema: "create one under Schemas",
  slack: "add a Slack bot under Bots, then pick it in the editor",
  discord: "add a Discord bot under Bots, then pick it in the editor",
  telegram: "add a Telegram bot under Bots, then pick it in the editor",
  whatsapp: "add a WhatsApp bot under Bots, then pick it in the editor",
};

/**
 * What to call a family in front of a person.
 *
 * `RESOURCE_FAMILY_NOUNS` verbatim, until it wasn't: this was a hand copy of
 * the same nine keys and the same nine words, and the only thing keeping them
 * equal was that nobody had edited either.
 */
const RESOURCE_NOUN: Readonly<Record<OrgResourceType, string>> =
  RESOURCE_FAMILY_NOUNS;

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
  const [databases, datasets, queues, emails, schemas, allBots] =
    await Promise.all([
      getDatabases(db, organizationId),
      getDatasets(db, organizationId),
      getQueues(db, organizationId),
      getEmails(db, organizationId),
      getSchemas(db, organizationId),
      getBots(db, organizationId),
    ]);

  // Oldest first, so `resourceToBind` is deterministic across runs rather than
  // dependent on whatever order the rows came back in.
  const named = (
    rows: Array<{
      id: string;
      name: string;
      description?: string;
      handle?: string;
      createdAt: Date | null;
    }>
  ): OrgResource[] =>
    [...rows]
      .sort(
        (a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0)
      )
      .map((row) => ({
        id: row.id,
        name: row.name,
        ...(row.description?.trim() ? { description: row.description } : {}),
        ...(row.handle ? { handle: row.handle } : {}),
      }));

  const byProvider = (provider: string): OrgResource[] =>
    named(allBots.filter((bot) => bot.provider === provider));

  /**
   * Schemas, carrying their fields. Stored as a JSON string; a row whose JSON
   * will not parse degrades to a schema without fields rather than failing the
   * whole load — it still binds, and only its derived ports are lost.
   */
  const withFields = (
    rows: Array<{
      id: string;
      name: string;
      description?: string;
      fields: string;
      createdAt: Date | null;
    }>
  ): OrgResource[] =>
    [...rows]
      .sort(
        (a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0)
      )
      .map((row) => {
        const resource: OrgResource = {
          id: row.id,
          name: row.name,
          ...(row.description?.trim() ? { description: row.description } : {}),
        };
        try {
          const fields: unknown = JSON.parse(row.fields);
          if (Array.isArray(fields)) resource.fields = fields as Field[];
        } catch {
          // Deliberately swallowed; see above.
        }
        return resource;
      });

  return {
    database: named(databases),
    dataset: named(datasets),
    queue: named(queues),
    email: named(emails),
    schema: withFields(schemas),
    slack: byProvider("slack"),
    discord: byProvider("discord"),
    telegram: byProvider("telegram"),
    whatsapp: byProvider("whatsapp"),
  };
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
