import type { NodeType, Parameter } from "@dafthunk/types";
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
    expect(section).toContain("Databases —");
    expect(section).toContain("None yet. One can be created.");
    expect(section).toContain('"Product docs"');
    expect(section).toContain("Indexed help articles");
  });

  it("renders reuse-only families only when something exists to reuse", () => {
    const section = projectGroundingForBrief(context());
    expect(section).toContain("Discord bots —");
    expect(section).toContain('"HelpBot"');
    expect(section).not.toContain("Telegram bots");
  });

  it("never renders a resource id", () => {
    const section = projectGroundingForBrief(context());
    for (const id of ["ds-1", "ds-2", "em-1", "bot-1"]) {
      expect(section).not.toContain(id);
    }
  });

  it("stays small enough for the fast tier", () => {
    // ~450 tokens is the ceiling the design set for the brief turn; four
    // characters per token is the usual rough cut.
    expect(projectGroundingForBrief(context()).length).toBeLessThan(1800);
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
