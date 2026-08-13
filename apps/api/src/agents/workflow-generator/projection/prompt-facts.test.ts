import { env } from "cloudflare:test";
import type {
  BriefDestination,
  NodeType,
  WorkflowTrigger,
} from "@dafthunk/types";
import { RESOURCE_FAMILY_NOUNS, TRIGGER_TO_NODE_TYPES } from "@dafthunk/utils";
import { describe, expect, it } from "vitest";

import type { Bindings } from "../../../context";
import { CloudflareNodeRegistry } from "../../../runtime/cloudflare-node-registry";
import { pseudoNodeTypes } from "../ai-nodes";
import { CORE_NODE_TYPES } from "../core-nodes";
import { buildGroundingContext } from "../grounding";
import { RESPONDER_NODE_ID, TRIGGER_NODE_ID } from "../hydrate";
import { BRIEF_SCHEMA, buildBriefSystemPrompt } from "./brief-turn";
import { quotedIdentifiers, sections } from "./prompt-inspection";
import { buildSystemPrompt, DRAFT_SCHEMA } from "./synthesis-turn";

/**
 * Does every node type a prompt names actually reach the model?
 *
 * The stronger half of the drift guard, and the half that needs the real
 * registry. `prompts.test.ts` checks the prompts against the constants that
 * own each fact; this checks them against the catalog that ships.
 *
 * The oracle is deliberately NOT "is it registered". `selectCandidates` unions
 * `CORE_NODE_TYPES` into every catalog regardless of keyword score
 * (`catalog-selection.ts`), and everything else has to earn its place by
 * ranking against the request. So a prompt naming a real but unpinned type —
 * "use a to-string node" — names one whose ports the model may never see for
 * this particular request, and telling it to reach for a node it cannot
 * inspect is worse than not mentioning the node at all.
 */

/**
 * The catalog the generator ships with, not the one this machine is configured
 * for. Same reasoning, and the same placeholders, as `catalog-selection.test.ts`:
 * a seventh of the registry is credential-gated, those credentials live in
 * `.dev.vars`, and CI has none — so left ambient this suite would sweep 439
 * types on a laptop and 369 on CI.
 */
const bindings: Bindings = {
  ...(env as unknown as Bindings),
  CLOUDFLARE_ACCOUNT_ID: "test",
  CLOUDFLARE_API_TOKEN: "test",
  GOOGLE_API_KEY: "test",
  TAVILY_API_KEY: "test",
  TWILIO_ACCOUNT_SID: "test",
  TWILIO_AUTH_TOKEN: "test",
  TWILIO_PHONE_NUMBER: "test",
  INTEGRATION_DISCORD_CLIENT_ID: "test",
  INTEGRATION_DISCORD_CLIENT_SECRET: "test",
  INTEGRATION_GITHUB_CLIENT_ID: "test",
  INTEGRATION_GITHUB_CLIENT_SECRET: "test",
  INTEGRATION_GOOGLE_CALENDAR_CLIENT_ID: "test",
  INTEGRATION_GOOGLE_CALENDAR_CLIENT_SECRET: "test",
  INTEGRATION_GOOGLE_MAIL_CLIENT_ID: "test",
  INTEGRATION_GOOGLE_MAIL_CLIENT_SECRET: "test",
  INTEGRATION_LINKEDIN_CLIENT_ID: "test",
  INTEGRATION_LINKEDIN_CLIENT_SECRET: "test",
  INTEGRATION_REDDIT_CLIENT_ID: "test",
  INTEGRATION_REDDIT_CLIENT_SECRET: "test",
  INTEGRATION_WORDPRESS_CLIENT_ID: "test",
  INTEGRATION_WORDPRESS_CLIENT_SECRET: "test",
  INTEGRATION_X_CLIENT_ID: "test",
  INTEGRATION_X_CLIENT_SECRET: "test",
};

const CATALOG: NodeType[] = new CloudflareNodeRegistry(
  bindings,
  false
).getNodeTypes();

/** Everything that exists, including the curated stand-ins. */
const REGISTERED: ReadonlySet<string> = new Set([
  ...CATALOG.map((nodeType) => nodeType.type),
  ...pseudoNodeTypes().map((nodeType) => nodeType.type),
]);

/**
 * Everything the model is shown for EVERY request, whatever it asked for.
 *
 * `CORE_NODE_TYPES` and nothing else, because that is what `selectCandidates`
 * actually unions into every catalog. This briefly also included
 * `OFFERED_AI_TYPES` — which is not pinned by anything — to accommodate rule 6
 * naming all eight curated model nodes unconditionally. That is the failure
 * this sweep exists to catch, papered over by widening its own oracle: five of
 * those eight are score-gated into a sixty-of-four-hundred catalog, so the
 * prompt was telling the model to reach for types the catalog often did not
 * contain. Rule 6 now narrows with the catalog and the oracle can be honest.
 */
const PINNED: ReadonlySet<string> = new Set(CORE_NODE_TYPES);

/**
 * Identifier-shaped tokens that are not platform identifiers.
 *
 * Kept short and reviewed. Everything here is a value invented inside a worked
 * example, which is why it looks like an id and is not one — if this list grows
 * past a handful, the examples are naming too much.
 */
const NOT_IDENTIFIERS: ReadonlySet<string> = new Set([
  // The schema name in the `resources` worked example in the grounding section.
  "product_question",
]);

/** Trigger kinds are identifier-shaped too, and they are platform facts. */
const TRIGGER_KEYS: ReadonlySet<string> = new Set(
  Object.keys(TRIGGER_TO_NODE_TYPES)
);

const FAMILY_KEYS: ReadonlySet<string> = new Set(
  Object.keys(RESOURCE_FAMILY_NOUNS)
);

const RESOURCES: Parameters<typeof buildGroundingContext>[0]["orgResources"] = {
  database: [{ id: "db-1", name: "Customers" }],
  dataset: [{ id: "ds-1", name: "Product docs" }],
  queue: [],
  email: [{ id: "em-1", name: "support", handle: "support" }],
  schema: [],
  discord: [{ id: "bot-1", name: "HelpBot" }],
  telegram: [],
  whatsapp: [],
  slack: [],
};

const GROUNDING = buildGroundingContext({
  nodeTypes: CATALOG,
  orgResources: RESOURCES,
  emailDomain: "mail.example.com",
});

const DESTINATIONS: BriefDestination[] = [
  {
    id: "email",
    kind: "email",
    label: "email it to you",
    nodeTypes: ["send-email"],
  },
  {
    id: "display",
    kind: "display",
    label: "show it to you here",
    nodeTypes: ["output-text"],
  },
];

/**
 * Every prompt this module can emit, under the inputs that change its shape.
 *
 * The catalog is the real one: a sweep over fixture types would pass while the
 * shipped prompt named something the shipped registry does not have.
 */
const PROMPTS: Array<{ id: string; prompt: string }> = [
  {
    id: "synthesis",
    prompt: buildSystemPrompt({
      catalog: CATALOG.slice(0, 60),
      nodeTypes: CATALOG,
      withheld: [],
      query: "summarize my support email and post it to discord",
      grounding: GROUNDING,
    }),
  },
  {
    id: "synthesis (nothing optional)",
    prompt: buildSystemPrompt({
      catalog: CATALOG.slice(0, 60),
      nodeTypes: CATALOG,
      withheld: [],
      query: "summarize my support email",
    }),
  },
  {
    id: "synthesis (delivery promised)",
    prompt: buildSystemPrompt({
      catalog: CATALOG.slice(0, 60),
      nodeTypes: CATALOG,
      withheld: [],
      query: "email me a digest",
      grounding: GROUNDING,
      destination: DESTINATIONS[0],
    }),
  },
  {
    id: "brief",
    prompt: buildBriefSystemPrompt({
      destinations: DESTINATIONS,
      triggers: Object.keys(TRIGGER_TO_NODE_TYPES) as WorkflowTrigger[],
      connectedProviders: new Set(["discord"]),
      grounding: GROUNDING,
    }),
  },
  { id: "draft schema", prompt: JSON.stringify(DRAFT_SCHEMA) },
  { id: "brief schema", prompt: JSON.stringify(BRIEF_SCHEMA) },
];

/** Identifier-shaped tokens a prompt names, minus the ones that are not ids. */
function namedIdentifiers(prompt: string): string[] {
  return quotedIdentifiers(sections(prompt).prose).filter(
    (token) =>
      !NOT_IDENTIFIERS.has(token) &&
      !TRIGGER_KEYS.has(token) &&
      !FAMILY_KEYS.has(token) &&
      token !== TRIGGER_NODE_ID &&
      token !== RESPONDER_NODE_ID
  );
}

describe("the sweep is looking at something", () => {
  /**
   * A guard that filters everything out passes for the wrong reason.
   *
   * Both sweeps below assert an empty result, so a broken extractor — a regex
   * that stops matching, a filter that swallows the lot — would read as a clean
   * bill of health forever. This is the tripwire: the synthesis prompt names
   * node types in its rules, and if it suddenly names none, that is the
   * extractor breaking rather than the prose improving.
   */
  it("finds the node types the synthesis rules name", () => {
    const found = namedIdentifiers(PROMPTS[0].prompt);
    expect(found.length).toBeGreaterThanOrEqual(5);
    expect(found).toContain("output-text");
  });
});

describe("no prompt names a node type that does not exist", () => {
  it.each(PROMPTS)("$id", ({ prompt }) => {
    const unknown = namedIdentifiers(prompt).filter(
      (type) => !REGISTERED.has(type)
    );
    expect(
      unknown.sort(),
      "named in a prompt and absent from the registry"
    ).toEqual([]);
  });
});

describe("no prompt names a node type the model might not be shown", () => {
  /**
   * A real type that keyword ranking never surfaced is a type whose ports the
   * model cannot read, so an instruction to use it is an instruction it cannot
   * follow. `CORE_NODE_TYPES` is unioned into every catalog, which makes it the
   * honest oracle for "may a prompt name this".
   */
  it.each(PROMPTS)("$id", ({ prompt }) => {
    const unpinned = namedIdentifiers(prompt)
      .filter((type) => REGISTERED.has(type))
      .filter((type) => !PINNED.has(type));
    expect(
      unpinned.sort(),
      "named in a prompt but not pinned into every catalog"
    ).toEqual([]);
  });
});

describe("the trigger section describes what the server will inject", () => {
  it("describes every trigger that injects a node", () => {
    const triggers = sections(PROMPTS[0].prompt).body.get("Triggers") ?? "";
    for (const [trigger, typeIds] of Object.entries(TRIGGER_TO_NODE_TYPES)) {
      if (typeIds.length === 0) continue;
      expect(triggers, `${trigger} is offered but never described`).toContain(
        `"${trigger}"`
      );
    }
  });

  it("names the dynamic-input convention the node type actually declares", () => {
    // Rule 7 teaches "var_1, var_2". The node decides that prefix, and the
    // catalog projection renders it derived two hundred lines away — so the
    // rule and the rendering can disagree without anything failing.
    const nodeType = CATALOG.find(
      (entry) => entry.type === "var-string-template"
    );
    expect(nodeType?.dynamicInputs).toBeDefined();
    expect(PROMPTS[0].prompt).toContain(`${nodeType?.dynamicInputs?.prefix}_1`);
  });
});
