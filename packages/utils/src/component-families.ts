import type {
  BriefResourceFamily,
  NodeType,
  ParameterType,
  WorkflowTrigger,
} from "@dafthunk/types";

import { TRIGGER_TO_NODE_TYPES } from "./workflow-authoring";

/**
 * The platform's component families, described at the entity level.
 *
 * The same pattern `static nodeType` gives every node — a typed metadata
 * attribute next to the thing it describes — lifted one level up: what a
 * "database" IS on Dafthunk, before any org owns one. The `purpose` line is
 * the only hand-written prose; everything else about a family (which nodes
 * consume it, which triggers involve it) is derived from the live registry by
 * `deriveFamilyCapabilities`, so it evolves with the code.
 *
 * A `Record<ComponentFamilyId, …>` on purpose: adding a family without
 * describing it fails to compile — the same trick `TRIGGER_TO_NODE_TYPES`
 * plays with triggers.
 */

export type ComponentFamilyId =
  // Platform families: what the platform itself is made of.
  | "node"
  | "ai-model"
  | "trigger"
  // Org-resource families: things a workspace owns instances of.
  | "database"
  | "dataset"
  | "queue"
  | "email"
  | "bot"
  | "schema";

export interface ComponentFamilyDescriptor {
  id: ComponentFamilyId;
  /** The noun as it reads inside a sentence: "database", "mailbox", "bot". */
  noun: string;
  /** 1–2 sentences: what this IS on Dafthunk. The only hand-written prose. */
  purpose: string;
  /**
   * Parameter types whose inputs hold an instance id of this family. Empty for
   * platform families, which are not referenced by id. "bot" covers all four
   * providers because that is how the parameter types are keyed.
   */
  parameterTypes: readonly ParameterType["type"][];
  /** May the generator create an instance at generation time? */
  creatable: boolean;
}

export const COMPONENT_FAMILIES: Readonly<
  Record<ComponentFamilyId, ComponentFamilyDescriptor>
> = {
  node: {
    id: "node",
    noun: "node",
    purpose:
      "One step in a workflow graph: it takes typed inputs, does one thing, and produces typed outputs.",
    parameterTypes: [],
    creatable: false,
  },
  "ai-model": {
    id: "ai-model",
    noun: "AI model",
    purpose:
      "Text, image, transcription, speech and vision models that run inside nodes; no extra account is needed.",
    parameterTypes: [],
    creatable: false,
  },
  trigger: {
    id: "trigger",
    noun: "trigger",
    purpose:
      "What starts a workflow: by hand, on a schedule, or when a request, form submission, email, queue message or bot message arrives.",
    parameterTypes: [],
    creatable: false,
  },
  database: {
    id: "database",
    noun: "database",
    purpose:
      "A set of SQL tables the workspace owns, persisted between runs; workflows read and write it through database nodes.",
    parameterTypes: ["database"],
    creatable: true,
  },
  dataset: {
    id: "dataset",
    noun: "dataset",
    purpose:
      "A collection of documents the workspace owns; workflows search it and read files from it.",
    parameterTypes: ["dataset"],
    creatable: true,
  },
  queue: {
    id: "queue",
    noun: "queue",
    purpose:
      "Holds messages between workflows: one workflow sends to a queue, another starts when a message arrives on it.",
    parameterTypes: ["queue"],
    creatable: true,
  },
  email: {
    id: "email",
    noun: "mailbox",
    purpose:
      "A mailbox with its own address on the platform's mail domain; incoming mail can start workflows, and workflows can read and reply to its threads.",
    parameterTypes: ["email"],
    creatable: true,
  },
  bot: {
    id: "bot",
    noun: "bot",
    purpose:
      "A Discord, Telegram, WhatsApp or Slack identity connected with the workspace's own credentials; its messages can start workflows, and workflows reply through it.",
    parameterTypes: ["discord", "telegram", "whatsapp", "slack"],
    creatable: false,
  },
  schema: {
    id: "schema",
    noun: "schema",
    purpose:
      "A named record shape — typed fields — used to validate data and to force AI output into structured JSON.",
    parameterTypes: ["schema"],
    creatable: true,
  },
};

/**
 * The noun for each groundable resource family, provider-qualified for bots.
 * Used wherever a binding is stated in prose — "the Discord bot named …".
 */
export const RESOURCE_FAMILY_NOUNS: Readonly<
  Record<BriefResourceFamily, string>
> = {
  database: "database",
  dataset: "dataset",
  queue: "queue",
  email: "mailbox",
  schema: "schema",
  discord: "Discord bot",
  telegram: "Telegram bot",
  whatsapp: "WhatsApp bot",
  slack: "Slack bot",
};

export interface FamilyCapabilities {
  /**
   * Non-trigger node types with an input typed in the family's parameter
   * types — what a workflow can DO with an instance, derived live.
   */
  consumers: NodeType[];
  /**
   * Trigger kinds whose injected trigger node consumes this family — how an
   * instance can START a workflow.
   */
  triggerKinds: WorkflowTrigger[];
}

function consumesFamily(
  nodeType: NodeType,
  parameterTypes: ReadonlySet<string>
): boolean {
  return nodeType.inputs.some((input) => parameterTypes.has(input.type));
}

/**
 * What the live registry says a family can do.
 *
 * Pure over `NodeType[]` so both ends could render it, and so a new node with
 * a `dataset` input shows up as a dataset capability without anyone editing a
 * list.
 */
export function deriveFamilyCapabilities(
  family: ComponentFamilyDescriptor,
  nodeTypes: NodeType[]
): FamilyCapabilities {
  if (family.parameterTypes.length === 0) {
    return { consumers: [], triggerKinds: [] };
  }

  const parameterTypes = new Set<string>(family.parameterTypes);
  const byType = new Map(nodeTypes.map((entry) => [entry.type, entry]));

  const consumers = nodeTypes.filter(
    (entry) =>
      !entry.trigger &&
      !entry.responder &&
      consumesFamily(entry, parameterTypes)
  );

  const triggerKinds = (
    Object.entries(TRIGGER_TO_NODE_TYPES) as [WorkflowTrigger, string[]][]
  )
    .filter(([, typeIds]) =>
      typeIds.some((typeId) => {
        const nodeType = byType.get(typeId);
        return (
          nodeType !== undefined && consumesFamily(nodeType, parameterTypes)
        );
      })
    )
    .map(([trigger]) => trigger);

  return { consumers, triggerKinds };
}
