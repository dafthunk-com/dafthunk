import { describe, expect, it } from "vitest";

import {
  BINDABLE_RESOURCE_TYPES,
  bindableResources,
  boundResourceNote,
  describeMissingResource,
  resourceToBind,
} from "./org-resources";

describe("BINDABLE_RESOURCE_TYPES", () => {
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
      expect(BINDABLE_RESOURCE_TYPES.has(arming)).toBe(false);
    }
  });

  it("includes the passive types", () => {
    expect(BINDABLE_RESOURCE_TYPES.has("database")).toBe(true);
    expect(BINDABLE_RESOURCE_TYPES.has("dataset")).toBe(true);
  });
});

describe("bindableResources", () => {
  it("offers only what the org actually owns", () => {
    const usable = bindableResources({
      database: [{ id: "db1", name: "Main" }],
      dataset: [],
    });

    expect([...usable]).toEqual(["database"]);
  });

  it("never offers a bot, however many the org has", () => {
    const usable = bindableResources({
      slack: [{ id: "b1", name: "Support" }],
      queue: [{ id: "q1", name: "Jobs" }],
    });

    expect([...usable]).toEqual([]);
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
