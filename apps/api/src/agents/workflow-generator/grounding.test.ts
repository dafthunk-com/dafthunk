import type { NodeType, Parameter } from "@dafthunk/types";
import { COMPONENT_FAMILIES } from "@dafthunk/utils";
import { describe, expect, it } from "vitest";

import {
  buildGroundingContext,
  projectGroundingForBrief,
  projectGroundingForSynthesis,
} from "./grounding";
import type { OrgResources } from "./org-resources";

function input(name: string, type: Parameter["type"]): Parameter {
  return { name, type } as Parameter;
}

const NODE_TYPES: NodeType[] = [
  {
    id: "dataset-ai-search",
    name: "Dataset AI Search",
    type: "dataset-ai-search",
    tags: ["RAG"],
    icon: "search",
    inputs: [input("dataset", "dataset"), input("query", "string")],
    outputs: [],
  },
  {
    id: "receive-email",
    name: "Receive Email",
    type: "receive-email",
    tags: ["Email"],
    icon: "mail",
    trigger: true,
    inputs: [input("email", "email")],
    outputs: [],
  },
];

const RESOURCES: OrgResources = {
  database: [],
  dataset: [
    {
      id: "ds-1",
      name: "Product docs",
      description: "Indexed help articles the workflow searches",
    },
    { id: "ds-2", name: "Support KB" },
  ],
  queue: [],
  email: [{ id: "em-1", name: "support", handle: "support-x9" }],
  schema: [],
  discord: [{ id: "bot-1", name: "HelpBot" }],
  telegram: [],
  whatsapp: [],
  slack: [],
};

function context() {
  return buildGroundingContext({
    nodeTypes: NODE_TYPES,
    orgResources: RESOURCES,
    emailDomain: "mail.example.com",
  });
}

describe("buildGroundingContext", () => {
  it("keeps the full instance list, ids included, for validation", () => {
    const datasets = context().families.find(
      (family) => family.family === "dataset"
    );
    expect(datasets?.instances.map((instance) => instance.id)).toEqual([
      "ds-1",
      "ds-2",
    ]);
  });

  it("composes mailbox addresses from handle and domain", () => {
    const emails = context().families.find(
      (family) => family.family === "email"
    );
    expect(emails?.instances[0].address).toBe("support-x9@mail.example.com");
  });

  it("derives trigger kinds per provider, not per descriptor", () => {
    const emails = context().families.find(
      (family) => family.family === "email"
    );
    expect(emails?.triggerKinds).toEqual(["email_message"]);
    const discord = context().families.find(
      (family) => family.family === "discord"
    );
    expect(discord?.triggerKinds).toEqual([]);
  });
});

describe("projectGroundingForBrief", () => {
  it("renders every creatable family, owned or not", () => {
    const section = projectGroundingForBrief(context());
    // Entity presence is the point: zero-instance families still get a line,
    // so "log it to a database" reads back correctly with nothing owned.
    expect(section).toContain("- database —");
    expect(section).toContain("None yet. One can be created.");
    expect(section).toContain('"Product docs"');
    expect(section).toContain("Indexed help articles");
  });

  it("renders reuse-only families only when something exists to reuse", () => {
    const section = projectGroundingForBrief(context());
    expect(section).toContain("- discord (a Discord bot) —");
    expect(section).toContain('"HelpBot"');
    // Not `"Telegram"` — the bot purpose names all four providers in prose.
    expect(section).not.toContain("- telegram");
  });

  it("leads each line with the key the model has to write back", () => {
    const section = projectGroundingForBrief(context());
    // The whole defect this fixes: every projection rendered the noun, so the
    // model read "Mailboxes" and had to infer from another paragraph that the
    // family key is `email`. The noun is kept, in parentheses, only where the
    // two words differ.
    expect(section).toContain("- email (a mailbox) —");
    expect(section).toContain("- database —");
    expect(section).not.toContain("database (a database)");
  });

  it("says which families can start a workflow", () => {
    // The brief turn sees no catalog at all, so this line is the only thing in
    // its prompt saying a mailbox is a way to begin. Derived by
    // `deriveFamilyCapabilities`, which computed it for a long time before any
    // projection rendered it.
    const section = projectGroundingForBrief(context());
    expect(section).toContain("Can start a workflow: email_message.");
    // Nothing in this fixture makes a dataset a trigger, so it claims nothing.
    expect(section).not.toMatch(/- dataset —[^\n]*Can start a workflow/);
  });

  it("never renders a resource id", () => {
    const section = projectGroundingForBrief(context());
    for (const id of ["ds-1", "ds-2", "em-1", "bot-1"]) {
      expect(section).not.toContain(id);
    }
  });

  it("stays small enough for the fast tier", () => {
    // ~500 tokens is the ceiling for the turn a person waits on; four
    // characters per token is the usual rough cut.
    //
    // Raised from 450 when the family keys and the trigger-kind clause landed:
    // the section grew about 1%, and it bought the two things this turn most
    // needed — the token the model must write back, and the only statement
    // anywhere in its prompt that a mailbox or a queue can start a workflow.
    // The budget is here to catch runaway growth, not to price a deliberate
    // twenty characters.
    expect(projectGroundingForBrief(context()).length).toBeLessThan(2000);
  });

  it("caps the instances it names", () => {
    const many: OrgResources = {
      ...RESOURCES,
      dataset: Array.from({ length: 8 }, (_, index) => ({
        id: `ds-${index}`,
        name: `Dataset ${index}`,
      })),
    };
    const section = projectGroundingForBrief(
      buildGroundingContext({ nodeTypes: NODE_TYPES, orgResources: many })
    );
    expect(section).toContain("and 3 more");
    expect(section).not.toContain('"Dataset 6"');
  });
});

describe("projectGroundingForSynthesis", () => {
  it("states that resource inputs are the server's to fill", () => {
    const section = projectGroundingForSynthesis(context());
    expect(section).toContain("filled by the server");
    expect(section).toContain('"Product docs"');
  });

  it("never renders a resource id", () => {
    const section = projectGroundingForSynthesis(context());
    for (const id of ["ds-1", "ds-2", "em-1", "bot-1"]) {
      expect(section).not.toContain(id);
    }
  });
});

/**
 * Which families the model is told it may create.
 *
 * Asserted in both directions, and that is the point rather than thoroughness
 * for its own sake. This was a hand-typed sentence listing four families while
 * the brief rendered the same fact per family from `family.creatable` twelve
 * lines away — two statements of one fact, and the typed one had already fallen
 * behind: it omitted `schema`, telling the model the family it most often has to
 * author could only be reused. Both are derived now, and these two tests are
 * what stops the sentence being written by hand again.
 */
describe("the grounding sections describe creation the way the platform permits it", () => {
  /**
   * Nouns the synthesis sentence lists as creatable. Anchored on the sentence
   * rather than swept out of the section, because every family's noun appears
   * elsewhere in the same text as a line of its own.
   */
  function creatableNounsNamed(section: string): string[] {
    const sentence = section.match(/Creatable: ([^—.\n]+)/);
    if (!sentence) return [];
    return sentence[1]
      .split(/,\s*|\s+and\s+/)
      .map((noun) => noun.trim())
      .filter(Boolean)
      .sort();
  }

  /** Families the platform lets the generator bring into being. */
  const creatable = Object.values(COMPONENT_FAMILIES)
    .filter((family) => family.creatable)
    .map((family) => family.noun)
    .sort();

  it("names every creatable family as creatable", () => {
    const named = creatableNounsNamed(projectGroundingForSynthesis(context()));
    expect(
      named.length,
      "the sentence that lists what can be created"
    ).toBeGreaterThan(0);

    expect(
      creatable.filter((noun) => !named.includes(noun)),
      "families the platform can create that the prompt does not offer"
    ).toEqual([]);
  });

  it("names nothing creatable that is not", () => {
    const named = creatableNounsNamed(projectGroundingForSynthesis(context()));
    expect(named.filter((noun) => !creatable.includes(noun))).toEqual([]);
  });

  it("agrees with the brief, which renders the same fact per family", () => {
    const brief = projectGroundingForBrief(context());
    // A creatable family reads "One can be created." (none owned) or "More can
    // be created." (some owned); a reuse-only family reads "Only these can be
    // used." So the brief already carries the fact the synthesis sentence
    // restates, and it carries it derived.
    expect(brief).toContain("can be created.");
    expect(brief).toContain("Only these can be used.");
  });
});
