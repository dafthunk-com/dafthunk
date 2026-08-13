import type { BriefDestination, WorkflowTrigger } from "@dafthunk/types";
import { FIELD_TYPES } from "@dafthunk/types";
import {
  areTypesCompatible,
  BLOB_COMPATIBLE_TYPES,
  explainIncompatibility,
  RESOURCE_FAMILY_NOUNS,
  TRIGGER_TO_NODE_TYPES,
} from "@dafthunk/utils";
import { describe, expect, it } from "vitest";
import { DESTINATION_IDS } from "../destinations";
import { OFFERED_AI_TYPES } from "../eligibility";
import { FIXTURE_NODE_TYPES } from "../fixtures/node-types";
import { buildGroundingContext } from "../grounding";
import type { OrgResources } from "../org-resources";
import { BRIEF_SCHEMA, buildBriefSystemPrompt } from "./brief-turn";
import { prefixClaims, sections } from "./prompt-inspection";
import { buildSystemPrompt, DRAFT_SCHEMA } from "./synthesis-turn";

/**
 * What the prompts claim, checked against the modules that own the facts.
 *
 * The prompt is an unversioned public API. Its consumer cannot read our source,
 * cannot be deprecated and never files a bug report — so a sentence describing
 * the platform as it was a year ago goes on being sent, forever, and the only
 * symptom is a generation that is slightly worse than it should be. Nothing
 * else in the suite can see that. These tests are the compiler that side of the
 * call does not have.
 *
 * They are deliberately free and offline: no registry, no model, milliseconds.
 * `prompt-facts.test.ts` pays the registry cost for the sweeps that need it.
 */

/**
 * Statements the prompts get wrong today, pinned to the exact difference.
 *
 * The idiom is `catalog-selection.test.ts`'s `KNOWN_RETRIEVAL_GAPS`, and the
 * reason is the same: pinned to an exact set with `toEqual`, a NEW drift fails
 * the suite and *fixing* one of these also fails it until the entry is deleted.
 * So the list cannot rot into a permanent exception, and the suite is green at
 * every commit while the burn-down happens one entry at a time.
 *
 * Every entry here is a sentence the model is currently being told that is not
 * true of this platform.
 */
const KNOWN_PROMPT_DRIFT: Record<string, string[]> = {
  /**
   * Three optional sections interpolate to the empty string when their input is
   * absent, leaving a run of blank lines before `# Available node types`.
   * Cosmetic, but it is the visible edge of assembling a prompt by
   * concatenation, and it will be gone once the sections are composed.
   */
  "synthesis/blank-runs": ["blank-run"],
};

const drift = (key: string): string[] => KNOWN_PROMPT_DRIFT[key] ?? [];

const RESOURCES: OrgResources = {
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
  nodeTypes: FIXTURE_NODE_TYPES,
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

type SystemPromptInput = Parameters<typeof buildSystemPrompt>[0];

function systemPrompt(overrides: Partial<SystemPromptInput> = {}): string {
  return buildSystemPrompt({
    catalog: FIXTURE_NODE_TYPES,
    nodeTypes: FIXTURE_NODE_TYPES,
    withheld: [],
    query: "summarize my support email",
    grounding: GROUNDING,
    ...overrides,
  });
}

function briefPrompt(): string {
  return buildBriefSystemPrompt({
    destinations: DESTINATIONS,
    triggers: Object.keys(TRIGGER_TO_NODE_TYPES) as WorkflowTrigger[],
    connectedProviders: new Set(["discord"]),
    grounding: GROUNDING,
  });
}

/**
 * The quoted alternatives following a key inside a schema description.
 *
 * Anchored on the key rather than scanning for quoted words, and requiring at
 * least two alternatives, so a plain `"type": "string"` elsewhere in the same
 * sentence cannot be mistaken for the union.
 */
function unionAfter(description: string, key: string): string[] {
  const match = description.match(
    new RegExp(`"${key}":\\s*("[a-z]+"(?:\\|"[a-z]+")+)`)
  );
  if (!match) return [];
  return [...match[1].matchAll(/"([a-z]+)"/g)].map((entry) => entry[1]).sort();
}

const RESOURCES_DESCRIPTION = DRAFT_SCHEMA.properties.resources
  .description as string;

describe("the draft schema states the platform, not a memory of it", () => {
  it("offers exactly the triggers the platform has", () => {
    expect([...DRAFT_SCHEMA.properties.trigger.enum].sort()).toEqual(
      Object.keys(TRIGGER_TO_NODE_TYPES).sort()
    );
  });

  it("names every resource family the wire accepts", () => {
    // A closed sweep rather than one union, because the description states the
    // families in two places on purpose: the eight that are somewhere a node
    // reads or writes, and — separately — the one that is a record shape. Both
    // halves are derived; what matters is that between them they name all nine.
    const owned = Object.keys(RESOURCE_FAMILY_NOUNS).sort();
    const named = owned.filter((family) =>
      RESOURCES_DESCRIPTION.includes(`"${family}"`)
    );

    expect(
      owned.filter((family) => !named.includes(family)),
      "families the platform accepts that the schema never names"
    ).toEqual([]);
  });

  it("offers nothing as a place that the platform does not have", () => {
    const places = unionAfter(RESOURCES_DESCRIPTION, "family");
    expect(places.length, "the union of places").toBeGreaterThan(0);
    expect(
      places.filter(
        (family) => !Object.keys(RESOURCE_FAMILY_NOUNS).includes(family)
      )
    ).toEqual([]);
  });

  it("names exactly the field types a schema can hold", () => {
    const named = unionAfter(RESOURCES_DESCRIPTION, "type");
    const owned: string[] = [...FIELD_TYPES].sort();

    expect(named.filter((type) => !owned.includes(type))).toEqual([]);
    expect(
      owned.filter((type) => !named.includes(type)),
      "field types the platform has that the schema does not name"
    ).toEqual([]);
  });
});

describe("the brief's worked example teaches ids that still exist", () => {
  /**
   * The example is a JSON blob a person maintains, and it should stay one —
   * deriving it would make it unreadable for the sake of two strings. What it
   * must not do is quietly outlive a renamed destination spec, teaching the
   * model an id the server would reject.
   */
  /**
   * Parsed rather than swept. The example is valid JSON, so reading it as JSON
   * is exact — a regex over the text cannot tell a destination option id from a
   * blank id or a trigger option id, and all three sit in the same shape.
   */
  function exampleBrief(): {
    destinationId: string;
    blanks: Array<{ role: string; options?: Array<{ id: string }> }>;
  } {
    const section = sections(briefPrompt()).body.get(
      "Example of the output shape"
    );
    expect(section).toBeDefined();

    const text = section ?? "";
    const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    return JSON.parse(json);
  }

  it("is still valid JSON in the shape the schema asks for", () => {
    const brief = exampleBrief();
    expect(brief.destinationId).toBeTruthy();
    expect(brief.blanks.length).toBeGreaterThan(0);
  });

  it("names only real destination ids", () => {
    const brief = exampleBrief();
    const destinationBlank = brief.blanks.find(
      (blank) => blank.role === "destination"
    );
    expect(destinationBlank, "the destination blank").toBeDefined();

    const named = [
      brief.destinationId,
      ...(destinationBlank?.options ?? []).map((option) => option.id),
    ];

    expect(named.length).toBeGreaterThan(0);
    expect(
      [...new Set(named)].filter((id) => !DESTINATION_IDS.includes(id)).sort(),
      "named in the brief's worked example and absent from DESTINATION_SPECS"
    ).toEqual([]);
  });
});

describe("the brief schema states the platform", () => {
  it("names exactly the resource families a grounded blank can carry", () => {
    const description = BRIEF_SCHEMA.properties.blanks.items.properties
      .grounding.properties.family.description as string;
    const named = description
      .split(/,\s*|\s+or\s+/)
      .map((entry) => entry.trim())
      .filter(Boolean)
      .sort();

    expect(named).toEqual(Object.keys(RESOURCE_FAMILY_NOUNS).sort());
  });
});

describe("the type rules the prompt teaches are the rules the validator enforces", () => {
  /**
   * Every claim the type-rules section makes, as a call to the predicate that
   * will actually reject the edge.
   *
   * Close to tautological now that the section is rendered from
   * `explainIncompatibility` — and that is the point. These pin that it stays
   * rendered: the moment someone writes the rules out by hand again, the table
   * is what notices when one of them stops being true.
   */
  it.each([
    ["json", "string", false],
    ["number", "string", false],
    ["boolean", "string", false],
    ["any", "image", true],
    ["image", "any", true],
    ["blob", "image", true],
    ["image", "blob", true],
    ["image", "audio", false],
    ["string", "string", true],
  ])("%s -> %s is compatible: %s", (from, to, compatible) => {
    expect(areTypesCompatible(from, to)).toBe(compatible);
  });

  const typeRules = (): string => {
    const rules = [...sections(systemPrompt()).body].find(([heading]) =>
      heading.startsWith("Type rules")
    )?.[1];
    expect(rules).toBeDefined();
    return rules ?? "";
  };

  it("lists exactly the blob flavours", () => {
    const named = [...BLOB_COMPATIBLE_TYPES].filter((flavour) =>
      typeRules().includes(flavour)
    );
    expect(named.sort()).toEqual([...BLOB_COMPATIBLE_TYPES].sort());
  });

  it("still demonstrates every rejection it means to", () => {
    // The section is rendered by running `explainIncompatibility` over chosen
    // pairs, so a pair that became legal would drop out and the section would
    // quietly get shorter. Counting the bullets is what turns that into a
    // failure rather than a gap nobody sees.
    const bullets = typeRules()
      .split("\n")
      .filter((line) => line.startsWith("- "));
    expect(bullets).toHaveLength(3);
  });

  it("teaches the json rule in the validator's own words", () => {
    // The point of rendering rather than paraphrasing: a repair round quotes
    // `explainIncompatibility`, and this section now quotes it too, so the
    // model is never asked to reconcile two wordings of one rule.
    const reason = explainIncompatibility("json", "string");
    expect(reason).toBeTruthy();
    expect(typeRules()).toContain(reason ?? "");
  });
});

describe("a prompt names the nodes it offers, never a class they belong to", () => {
  /**
   * A prefix claim — `"ai-*"` — asserts that a whole set shares a name shape.
   * It is the one kind of statement that goes on reading correctly while the
   * set beneath it is replaced, which is exactly what happened: the rule
   * survived `ai-text` being deleted and the curated list moving to agent,
   * gemini and dataset types, and ended up describing two of the eight nodes
   * it was pointing at.
   *
   * So the rule now is the sharpest one available — a quoted token carrying a
   * `*` is a bug by construction. There is no way to write a stale class name
   * that this does not catch.
   */
  it("makes no prefix claim at all", () => {
    expect(prefixClaims(sections(systemPrompt()).prose)).toEqual([]);
  });

  it("names every model node the catalog actually contains", () => {
    // Intersected with the catalog, not the global curated list. Rule 6 may
    // only point at what this request's catalog holds — five of the eight
    // curated types are score-gated, so naming all eight unconditionally told
    // the model to reach for nodes whose ports it could not read. Stated this
    // way the assertion is also stronger: it fails both if the rule names
    // something absent and if it omits something present.
    const inCatalog = new Set(FIXTURE_NODE_TYPES.map((type) => type.type));
    const prose = sections(systemPrompt()).prose;

    const shown = [...OFFERED_AI_TYPES].filter((type) => inCatalog.has(type));
    expect(
      shown.length,
      "curated model nodes in the fixture catalog"
    ).toBeGreaterThan(0);

    expect(
      shown.filter((type) => !prose.includes(`"${type}"`)).sort(),
      "in the catalog the model is shown, but pointed at by no rule"
    ).toEqual([]);
  });

  it("points at no model node the catalog lacks", () => {
    const inCatalog = new Set(FIXTURE_NODE_TYPES.map((type) => type.type));
    const prose = sections(systemPrompt()).prose;

    expect(
      [...OFFERED_AI_TYPES]
        .filter((type) => !inCatalog.has(type) && prose.includes(`"${type}"`))
        .sort(),
      "named by a rule but absent from the catalog the model is shown"
    ).toEqual([]);
  });
});

describe("every prompt is assembled without accidents", () => {
  const PROMPTS: Array<[string, string]> = [
    ["synthesis", systemPrompt()],
    ["synthesis (nothing optional)", systemPrompt({ grounding: undefined })],
    ["brief", briefPrompt()],
  ];

  it.each(
    PROMPTS
  )("%s carries no unresolved interpolation", (_name, prompt) => {
    for (const artifact of ["undefined", "null", "NaN", "[object Object]"]) {
      expect(prompt).not.toContain(artifact);
    }
  });

  it.each(PROMPTS)("%s has no empty section", (_name, prompt) => {
    for (const [heading, body] of sections(prompt).body) {
      expect(body.trim().length, `"${heading}" is empty`).toBeGreaterThan(0);
    }
  });

  it.each(PROMPTS)("%s has no run of blank lines", (name, prompt) => {
    // A run of blank lines means an optional section collapsed to "" and left
    // its separators behind — harmless to read, but it is the visible edge of
    // assembling a prompt by concatenating maybe-empty strings.
    const found = /\n{4,}/.test(prompt) ? ["blank-run"] : [];
    expect(found).toEqual(
      name.startsWith("synthesis") ? drift("synthesis/blank-runs") : []
    );
  });
});

describe("the synthesis prompt emits the sections it means to", () => {
  it("emits them in order", () => {
    expect(sections(systemPrompt()).order).toEqual([
      "How graphs work",
      "Type rules — these are enforced and are the most common cause of failure",
      "Rules",
      "Triggers",
      "Test examples",
      "Workspace components",
      "Available node types",
      "Examples of correct output",
    ]);
  });

  it("drops exactly the grounding section when the workspace is unknown", () => {
    const full = new Set(sections(systemPrompt()).order);
    const bare = new Set(
      sections(systemPrompt({ grounding: undefined })).order
    );

    // The difference, both ways: a refactor that drops a section it did not
    // mean to is the likeliest accident here, and the count alone would hide a
    // swap.
    expect([...full].filter((heading) => !bare.has(heading))).toEqual([
      "Workspace components",
    ]);
    expect([...bare].filter((heading) => !full.has(heading))).toEqual([]);
  });
});

describe("the brief prompt emits the sections it means to", () => {
  it("emits them in order", () => {
    expect(sections(briefPrompt()).order).toEqual([
      "What you are doing",
      "The moving parts",
      "Where results can go",
      "What this workspace has",
      "Triggers",
      "When you cannot do it",
      "Requests that are already complete, for tone",
      "Example of the output shape",
    ]);
  });
});
