import { describe, expect, it } from "vitest";

import {
  boundResourceNote,
  CREATABLE_RESOURCE_TYPES,
  describeMissingResource,
  offerableResources,
  PASSIVE_BINDABLE_TYPES,
  resourceToBind,
} from "./org-resources";

describe("PASSIVE_BINDABLE_TYPES", () => {
  /**
   * The safety property this whole feature rests on. `hydrate.disarm` blanks
   * the arming types because binding one marks a trigger active on save, and a
   * generated workflow would start consuming the org's real traffic before
   * anybody had looked at it.
   */
  it("never includes a type that would arm a live trigger", () => {
    for (const arming of [
      "queue",
      "email",
      "slack",
      "discord",
      "telegram",
      "whatsapp",
    ] as const) {
      expect(PASSIVE_BINDABLE_TYPES.has(arming)).toBe(false);
    }
  });

  it("includes the passive types", () => {
    expect(PASSIVE_BINDABLE_TYPES.has("database")).toBe(true);
    expect(PASSIVE_BINDABLE_TYPES.has("dataset")).toBe(true);
  });

  /**
   * Falling back to the oldest instance is a guess, and for every other family
   * it is a defensible one: a database is a place, and the workspace's first
   * one is probably the real one. A schema is the shape of a node's own ports,
   * so the same guess makes a form ask for an unrelated schema's fields.
   */
  it("excludes schemas, which are shaped per node rather than chosen", () => {
    expect(PASSIVE_BINDABLE_TYPES.has("schema")).toBe(false);
  });
});

describe("CREATABLE_RESOURCE_TYPES", () => {
  it("matches the family descriptors: everything but bots", () => {
    expect([...CREATABLE_RESOURCE_TYPES].sort()).toEqual([
      "database",
      "dataset",
      "email",
      "queue",
      "schema",
    ]);
  });
});

describe("offerableResources", () => {
  it("always offers the creatable families, owned or not", () => {
    const usable = offerableResources({});
    for (const type of CREATABLE_RESOURCE_TYPES) {
      expect(usable.has(type)).toBe(true);
    }
  });

  it("offers a bot family only when the org owns one", () => {
    expect(offerableResources({}).has("slack")).toBe(false);
    expect(
      offerableResources({ slack: [{ id: "b1", name: "Support" }] }).has(
        "slack"
      )
    ).toBe(true);
  });
});

describe("resourceToBind", () => {
  it("takes the first, which the loader orders oldest-first", () => {
    const chosen = resourceToBind(
      {
        database: [
          { id: "db1", name: "Main" },
          { id: "db2", name: "Scratch" },
        ],
      },
      "database"
    );

    expect(chosen?.id).toBe("db1");
  });

  it("is undefined when the org owns none", () => {
    expect(resourceToBind({ database: [] }, "database")).toBeUndefined();
  });
});

describe("describeMissingResource", () => {
  // Two situations with opposite fixes, and the old code said nothing at all
  // for either of them.
  it("says to create one when the org owns none", () => {
    const text = describeMissingResource("database", 0);
    expect(text).toContain("has none");
    expect(text).toContain("Databases");
  });

  it("says to open the workflow when the org owns one it cannot bind", () => {
    const text = describeMissingResource("slack", 2);
    expect(text).toContain("open the workflow");
    expect(text).not.toContain("has none");
  });
});

describe("boundResourceNote", () => {
  it("names the resource, so a wrong guess is visible", () => {
    expect(boundResourceNote("database", { id: "db1", name: "Main" })).toBe(
      'Used your database "Main".'
    );
  });
});
