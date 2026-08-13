import { describe, expect, it } from "vitest";

import type { Ineligible } from "./eligibility";
import {
  filterEligible,
  withheldProviders,
  withheldResources,
} from "./eligibility";
import { FIXTURE_NODE_TYPES } from "./fixtures/node-types";
import { offerableResources } from "./org-resources";

const typesOf = (nodeTypes: { type: string }[]) =>
  new Set(nodeTypes.map((nodeType) => nodeType.type));

const reasonFor = (withheld: Ineligible[], type: string) =>
  withheld.find((entry) => entry.type === type);

describe("org resources and eligibility", () => {
  it("withholds a database node when the workspace has no database", () => {
    const { eligible, withheld } = filterEligible(FIXTURE_NODE_TYPES, {
      connectedProviders: new Set(),
    });

    expect(typesOf(eligible).has("database-execute")).toBe(false);
    expect(reasonFor(withheld, "database-execute")).toMatchObject({
      reason: "org-resource",
      resource: "database",
    });
  });

  it("allows it once the resource is offerable", () => {
    const { eligible, withheld } = filterEligible(FIXTURE_NODE_TYPES, {
      connectedProviders: new Set(),
      offerableResources: new Set(["database"]),
    });

    expect(typesOf(eligible).has("database-execute")).toBe(true);
    expect(reasonFor(withheld, "database-execute")).toBeUndefined();
  });

  /**
   * Queue nodes are offerable now that a missing queue is something the
   * generator can create. The arming hazard that used to keep them withheld
   * did not move here — it lives in hydration, which binds arming types only
   * when told to explicitly and disarms the trigger node before save.
   */
  it("offers a queue node when the resource set says queues are offerable", () => {
    const { eligible } = filterEligible(FIXTURE_NODE_TYPES, {
      connectedProviders: new Set(),
      offerableResources: offerableResources({}),
    });

    expect(typesOf(eligible).has("send-queue-message")).toBe(true);
  });

  it("ignores optional resource inputs — only required ones gate a node", () => {
    const withOptionalSchema = {
      id: "model-x",
      name: "Model X",
      type: "model-x",
      description: "A model with an optional structured-output schema",
      tags: [],
      icon: "sparkles",
      inputs: [
        {
          name: "schema",
          type: "schema" as const,
          hidden: true,
          required: false,
        },
        { name: "prompt", type: "string" as const, required: true },
      ],
      outputs: [],
    };

    const { eligible } = filterEligible([withOptionalSchema], {
      connectedProviders: new Set(),
      // Nothing offerable at all — and the node must still be usable, because
      // it works untouched without the schema.
      offerableResources: new Set(),
    });

    expect(typesOf(eligible).has("model-x")).toBe(true);
  });

  it("offers an unconnected provider's node and tracks the gap", () => {
    const { eligible, withheld, unconnected } = filterEligible(
      FIXTURE_NODE_TYPES,
      { connectedProviders: new Set() }
    );

    // Unconnected is no longer a reason to withhold: the node is offered and
    // its step rehearses until the account is linked — but the gap is
    // recorded so the outcome screen can offer the connection.
    expect(typesOf(eligible).has("share-post-x")).toBe(true);
    expect(reasonFor(withheld, "share-post-x")).toBeUndefined();
    expect(unconnected).toContainEqual({
      type: "share-post-x",
      provider: "x",
    });
  });

  it("keeps the two withholding reasons apart", () => {
    const { withheld } = filterEligible(FIXTURE_NODE_TYPES, {
      connectedProviders: new Set(),
      // No OAuth config for X on this deployment — withheld outright, since
      // there is nothing the user could connect.
      availableProviders: new Set(["slack", "wordpress"]),
    });

    // An unavailable OAuth provider and a missing workspace resource have
    // different fixes, so they are recorded differently.
    expect(reasonFor(withheld, "share-post-x")).toMatchObject({
      reason: "integration",
      provider: "x",
    });
  });
});

/**
 * Both reporters answer "what should we tell the person", not "what did we
 * filter". Everything unusable is withheld; only the part the request was
 * reaching for is worth saying out loud, and `relevant` is how the caller —
 * which is the only thing that has seen the query — says which that is.
 */
describe("reporting withheld capabilities", () => {
  const withheld: Ineligible[] = [
    {
      type: "list-posts-wordpress",
      reason: "integration",
      provider: "wordpress",
    },
    {
      type: "share-post-linkedin",
      reason: "integration",
      provider: "linkedin",
    },
    { type: "send-queue-message", reason: "org-resource", resource: "queue" },
    { type: "receive-email", reason: "org-resource", resource: "email" },
  ];

  it("says nothing until the caller marks what the request reached for", () => {
    expect(withheldProviders(withheld)).toEqual([]);
    expect(withheldResources(withheld)).toEqual([]);
  });

  it("names only the marked ones", () => {
    const marked = withheld.map((entry) =>
      entry.provider === "wordpress" || entry.resource === "queue"
        ? { ...entry, relevant: true }
        : entry
    );

    // The point of the whole mechanism: someone asking about blog posts hears
    // about WordPress and does not hear about LinkedIn.
    expect(withheldProviders(marked)).toEqual(["wordpress"]);
    expect(withheldResources(marked)).toEqual(["queue"]);
  });
});

/**
 * The catalog names which AI node covers each capability. These pin the two
 * properties that make that curation worth having: the runner-up models stay
 * out, and they stay out *silently* — a workflow is not missing a capability
 * just because a cheaper model was not offered.
 */
describe("curated AI catalog", () => {
  const modelNode = (type: string, tags = ["AI"]) => ({
    id: type,
    name: type,
    type,
    description: "A model",
    tags,
    icon: "sparkles",
    inputs: [],
    outputs: [],
  });

  it("offers the named model and withholds the rest", () => {
    const { eligible } = filterEligible(
      [
        modelNode("agent-claude-opus-5"),
        modelNode("gpt-5-mini"),
        modelNode("gemini-2-5-flash"),
        modelNode("claude-35-haiku"),
        modelNode("agent-qwen3-30b-a3b-fp8"),
      ],
      { connectedProviders: new Set() }
    );

    expect(typesOf(eligible)).toEqual(new Set(["agent-claude-opus-5"]));
  });

  it("says nothing about the models it did not offer", () => {
    // Reporting them would read as "unavailable, go connect something", when
    // the truth is that a better node already covers the request.
    const { withheld } = filterEligible([modelNode("gpt-5-mini")], {
      connectedProviders: new Set(),
    });

    expect(reasonFor(withheld, "gpt-5-mini")).toBeUndefined();
  });

  it("keeps retrieval nodes, which are tagged AI but are not a model choice", () => {
    const { eligible } = filterEligible(
      [modelNode("dataset-ai-search"), modelNode("ai-image", ["AI", "Image"])],
      { connectedProviders: new Set() }
    );

    expect(typesOf(eligible)).toEqual(
      new Set(["dataset-ai-search", "ai-image"])
    );
  });

  it("leaves nodes without the AI tag alone", () => {
    const { eligible } = filterEligible(
      [modelNode("fetch", ["Network"]), modelNode("output-text", ["Output"])],
      { connectedProviders: new Set() }
    );

    expect(typesOf(eligible)).toEqual(new Set(["fetch", "output-text"]));
  });
});
