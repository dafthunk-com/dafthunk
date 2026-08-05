import { describe, expect, it } from "vitest";

import type { Ineligible } from "./eligibility";
import {
  filterEligible,
  withheldProviders,
  withheldResources,
} from "./eligibility";
import { FIXTURE_NODE_TYPES } from "./fixtures";

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

  it("allows it once the workspace owns one", () => {
    const { eligible, withheld } = filterEligible(FIXTURE_NODE_TYPES, {
      connectedProviders: new Set(),
      bindableResources: new Set(["database"]),
    });

    expect(typesOf(eligible).has("database-execute")).toBe(true);
    expect(reasonFor(withheld, "database-execute")).toBeUndefined();
  });

  /**
   * Owning a queue is not enough, and must never be. Binding it would mark the
   * trigger active the moment the generator saved, so a workflow nobody has
   * read yet would start consuming the org's real messages.
   */
  it("still withholds a queue node even when the workspace owns queues", () => {
    const { eligible, withheld } = filterEligible(FIXTURE_NODE_TYPES, {
      connectedProviders: new Set(),
      bindableResources: new Set(["database", "dataset"]),
    });

    expect(typesOf(eligible).has("send-queue-message")).toBe(false);
    expect(reasonFor(withheld, "send-queue-message")).toMatchObject({
      reason: "org-resource",
      resource: "queue",
    });
  });

  it("keeps the two withholding reasons apart", () => {
    const { withheld } = filterEligible(FIXTURE_NODE_TYPES, {
      connectedProviders: new Set(),
    });

    // An unconnected OAuth provider and a missing workspace resource have
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
