import type {
  CloudflareModelInfo,
  NodeType,
  WorkflowTrigger,
} from "@dafthunk/types";
import {
  COMPONENT_FAMILIES,
  type ComponentFamilyId,
  deriveFamilyCapabilities,
  RESOURCE_FAMILY_NOUNS,
} from "@dafthunk/utils";

import type { OrgResources, OrgResourceType } from "./org-resources";

/**
 * What the platform is made of, assembled for a prompt.
 *
 * Two levels, deliberately. The entity level — what a "database" IS here —
 * comes from `COMPONENT_FAMILIES` and evolves with the code. The instance
 * level — the org's "customers" database — comes from D1 rows the user wrote
 * descriptions onto. Both are read live at generation time; nothing in the
 * generator hand-writes a component description.
 *
 * The context carries instance ids because the normalizer validates grounded
 * blank options against them, but no projection ever renders one: the model
 * reads names, and ids travel out-of-band to hydration.
 */

export interface GroundingInstance {
  id: string;
  name: string;
  description?: string;
  /** Mailboxes only: the address, which is how a person knows the mailbox. */
  address?: string;
  /**
   * Schemas only: the field names, which are what a schema actually is.
   *
   * Every other family is identified by its name — one "Customers" database is
   * the customers database. Two schemas can share a subject and hold different
   * fields, and binding the wrong one silently rewires a node's ports, so the
   * name alone is not enough to tell them apart.
   */
  fields?: string[];
}

export interface FamilyGrounding {
  family: OrgResourceType;
  noun: string;
  purpose: string;
  creatable: boolean;
  /** Everything the org owns, oldest first — uncapped, because validation
   * needs the full list. Projections cap for the prompt. */
  instances: GroundingInstance[];
  /** Trigger kinds an instance of this family can start a workflow through. */
  triggerKinds: WorkflowTrigger[];
  /** Non-trigger node types that can do something with an instance. */
  consumerCount: number;
}

export interface GroundingContext {
  families: FamilyGrounding[];
  /** One prompt-ready line about the AI models available inside nodes. */
  aiModels: string;
}

/** Groundable families in render order, each tied to its entity descriptor. */
const GROUNDED_FAMILIES: ReadonlyArray<{
  type: OrgResourceType;
  descriptorId: ComponentFamilyId;
}> = [
  { type: "database", descriptorId: "database" },
  { type: "dataset", descriptorId: "dataset" },
  { type: "queue", descriptorId: "queue" },
  { type: "email", descriptorId: "email" },
  { type: "schema", descriptorId: "schema" },
  { type: "discord", descriptorId: "bot" },
  { type: "telegram", descriptorId: "bot" },
  { type: "whatsapp", descriptorId: "bot" },
  { type: "slack", descriptorId: "bot" },
];

export interface GroundingInput {
  nodeTypes: NodeType[];
  orgResources: OrgResources;
  /** Composes mailbox addresses; without it only handles are known, and a
   * handle is not something to show anyone. */
  emailDomain?: string;
  /** Live Workers AI catalog, best-effort; the line degrades to the static
   * purpose without it. */
  modelCatalog?: CloudflareModelInfo[];
}

/** How many task kinds the models line names before stopping. */
const MAX_MODEL_TASKS = 6;

/**
 * The ai-model family line, enriched from the live catalog when it is there:
 * the task names and counts come from upstream, so the sentence about what
 * models can do evolves with what Cloudflare actually serves.
 */
function aiModelsLine(modelCatalog?: CloudflareModelInfo[]): string {
  const purpose = COMPONENT_FAMILIES["ai-model"].purpose;
  if (!modelCatalog?.length) return purpose;

  const tasks = new Map<string, number>();
  for (const model of modelCatalog) {
    const task = model.task?.name;
    if (task) tasks.set(task, (tasks.get(task) ?? 0) + 1);
  }
  if (tasks.size === 0) return purpose;

  const summary = [...tasks.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_MODEL_TASKS)
    .map(([name, count]) => `${name} (${count})`)
    .join(", ");
  return `${purpose} Live catalog: ${summary}.`;
}

export function buildGroundingContext(input: GroundingInput): GroundingContext {
  const families = GROUNDED_FAMILIES.map(({ type, descriptorId }) => {
    const descriptor = COMPONENT_FAMILIES[descriptorId];
    // Capabilities per parameter type, not per descriptor: the bot descriptor
    // spans four providers, and a workspace's Telegram bot must not claim it
    // can start Discord workflows.
    const capabilities = deriveFamilyCapabilities(
      { ...descriptor, parameterTypes: [type] },
      input.nodeTypes
    );

    const instances: GroundingInstance[] = (input.orgResources[type] ?? []).map(
      (resource) => ({
        id: resource.id,
        name: resource.name,
        ...(resource.description ? { description: resource.description } : {}),
        ...(type === "email" && resource.handle && input.emailDomain
          ? { address: `${resource.handle}@${input.emailDomain}` }
          : {}),
        ...(type === "schema" && resource.fields?.length
          ? { fields: resource.fields.map((field) => field.name) }
          : {}),
      })
    );

    return {
      family: type,
      noun: RESOURCE_FAMILY_NOUNS[type],
      purpose: descriptor.purpose,
      creatable: descriptor.creatable,
      instances,
      triggerKinds: capabilities.triggerKinds,
      consumerCount: capabilities.consumers.length,
    };
  });

  return {
    families,
    aiModels: aiModelsLine(input.modelCatalog),
  };
}

/** How many instances a projection names before saying "and N more". */
const MAX_PROJECTED_INSTANCES = 5;

/** Descriptions are one line in a prompt, however long their column is. */
const MAX_PROJECTED_DESCRIPTION = 100;

/** Enough of a schema's fields to recognize the shape, not to reproduce it. */
const MAX_PROJECTED_FIELDS = 8;

function pluralize(noun: string): string {
  return noun.endsWith("x") ? `${noun}es` : `${noun}s`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function truncate(text: string, limit: number): string {
  return text.length <= limit ? text : `${text.slice(0, limit - 1)}…`;
}

function projectInstance(instance: GroundingInstance): string {
  const parts = [`"${instance.name}"`];
  if (instance.address) parts.push(`<${instance.address}>`);
  if (instance.fields?.length) {
    const named = instance.fields.slice(0, MAX_PROJECTED_FIELDS).join(", ");
    const overflow = instance.fields.length - MAX_PROJECTED_FIELDS;
    parts.push(`[${named}${overflow > 0 ? `, +${overflow} more` : ""}]`);
  }
  if (instance.description) {
    parts.push(
      `(${truncate(instance.description, MAX_PROJECTED_DESCRIPTION)})`
    );
  }
  return parts.join(" ");
}

function projectInstances(family: FamilyGrounding): string {
  const named = family.instances
    .slice(0, MAX_PROJECTED_INSTANCES)
    .map(projectInstance)
    .join(", ");
  const overflow = family.instances.length - MAX_PROJECTED_INSTANCES;
  return overflow > 0 ? `${named} and ${overflow} more` : named;
}

/**
 * Whether a family earns a line at all.
 *
 * A creatable family always does — entity presence is the point: "log it to a
 * database" must read back correctly even when the org owns none. A reuse-only
 * family with nothing to reuse is a dead end, so it stays out entirely.
 */
function projectable(family: FamilyGrounding): boolean {
  return family.creatable || family.instances.length > 0;
}

/**
 * The compact section the brief turn reads. A person is waiting on that call,
 * so this is one line per family, hard-capped instances, and nothing else.
 */
export function projectGroundingForBrief(context: GroundingContext): string {
  const lines = context.families.filter(projectable).map((family) => {
    const label = capitalize(pluralize(family.noun));
    const owned = family.instances.length
      ? `Yours: ${projectInstances(family)}.`
      : `None yet.`;
    const tail = family.creatable
      ? family.instances.length
        ? " More can be created."
        : " One can be created."
      : " Only these can be used.";
    return `- ${label} — ${family.purpose} ${owned}${tail}`;
  });

  return `# What this workspace has

Workflows can use the workspace's own components. When the request implies one, say so in the sentence — name the real one, or say a new one is needed. Never invent one.

When a moving part IS one of these components — where data is read, stored, or sent — its blank must be grounded: set the blank's "grounding" to {"family": "dataset"} (or database, queue, email, schema, discord, telegram, whatsapp, slack) and each option's "resourceName" exactly as listed. Where a line says one can be created, add one option with "createNew": true.

${lines.join("\n")}
- AI models — ${context.aiModels}`;
}

/**
 * The fuller section synthesis reads: the same families, plus the rule that
 * resource inputs are the server's to fill.
 */
export function projectGroundingForSynthesis(
  context: GroundingContext
): string {
  const lines = context.families.filter(projectable).map((family) => {
    const owned = family.instances.length
      ? `Yours: ${projectInstances(family)}.`
      : `None owned yet.`;
    return `- ${family.noun} — ${family.purpose} ${owned}`;
  });

  return `# Workspace components

The workspace owns the components below. Resource inputs on nodes (database, dataset, queue, email, schema, bot ids) are filled by the server — never invent a value for one; leave it unset.

To use or create a component, add it to "resources". Reuse by the exact name listed; propose {"action": "create"} only when nothing listed fits. Creatable: database, dataset, queue, mailbox — bots can only be reused. Example:
"resources": [{"family": "dataset", "action": "create", "name": "Support articles", "description": "Indexed help articles the workflow searches"}]

Schemas work the other way round. A schema is a record shape, not a place, and a workflow usually needs several different ones: what a form asks for, what a model must emit, what a table's columns are. So write the shape each node needs — {"family": "schema", "action": "create", "nodeId": "...", "name": "...", "fields": [...]} — rather than picking one from the list. Give it the name you would use for that record; if the workspace already owns that exact shape under that name, the server reuses it instead of making a second one. Example:
"resources": [{"family": "schema", "action": "create", "nodeId": "trigger", "name": "product_question", "description": "What the visitor asked", "fields": [{"name": "email", "type": "string", "required": true, "label": "Your email"}, {"name": "question", "type": "string", "required": true, "label": "Your question"}]}]

${lines.join("\n")}
- AI models — ${context.aiModels}`;
}
