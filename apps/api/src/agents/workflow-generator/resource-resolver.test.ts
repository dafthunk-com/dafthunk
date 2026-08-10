import { describe, expect, it, vi } from "vitest";

import type { OrgResources } from "./org-resources";
import { createResourceResolver } from "./resource-resolver";

const OWNED: OrgResources = {
  dataset: [
    { id: "ds-1", name: "Product docs" },
    { id: "ds-2", name: "Support KB" },
  ],
  discord: [{ id: "bot-1", name: "HelpBot" }],
  queue: [],
};

/** A create stub that mints predictable ids. */
function createStub() {
  let counter = 0;
  return vi.fn(
    async (_type: string, spec: { name: string; description?: string }) => ({
      id: `new-${++counter}`,
      name: spec.name,
    })
  );
}

describe("createResourceResolver", () => {
  it("reuses by name, case-insensitively", async () => {
    const create = createStub();
    const resolver = createResourceResolver(OWNED, { create });

    const resolution = await resolver.resolve([
      { family: "dataset", action: "use", name: "product docs" },
    ]);

    expect(resolution.bindings.dataset?.id).toBe("ds-1");
    expect(create).not.toHaveBeenCalled();
    expect(resolution.created).toEqual([]);
  });

  it("creates what nothing owned can cover, and says so", async () => {
    const create = createStub();
    const resolver = createResourceResolver(OWNED, { create });

    const resolution = await resolver.resolve([
      {
        family: "queue",
        action: "create",
        name: "Incoming leads",
        description: "Feeds the enrichment workflow",
      },
    ]);

    expect(create).toHaveBeenCalledWith("queue", {
      name: "Incoming leads",
      description: "Feeds the enrichment workflow",
    });
    expect(resolution.bindings.queue?.id).toBe("new-1");
    expect(resolution.created).toHaveLength(1);
    expect(resolution.notes[0]).toContain('"Incoming leads"');
  });

  it("creates once across repair rounds, however often the draft re-asks", async () => {
    const create = createStub();
    const resolver = createResourceResolver(OWNED, { create });

    const first = await resolver.resolve([
      { family: "queue", action: "create", name: "Incoming leads" },
    ]);
    const second = await resolver.resolve([
      { family: "queue", action: "create", name: "incoming LEADS" },
    ]);

    expect(create).toHaveBeenCalledTimes(1);
    expect(second.bindings.queue?.id).toBe(first.bindings.queue?.id);
    // The second round created nothing, so it has nothing to announce.
    expect(second.created).toEqual([]);
    expect(second.notes).toEqual([]);
  });

  it("turns a create of something that already exists into reuse", async () => {
    const create = createStub();
    const resolver = createResourceResolver(OWNED, { create });

    const resolution = await resolver.resolve([
      { family: "dataset", action: "create", name: "Support KB" },
    ]);

    expect(create).not.toHaveBeenCalled();
    expect(resolution.bindings.dataset?.id).toBe("ds-2");
  });

  it("degrades a create on a reuse-only family to reuse", async () => {
    const create = createStub();
    const resolver = createResourceResolver(OWNED, { create });

    const resolution = await resolver.resolve([
      { family: "discord", action: "create", name: "HelpBot" },
    ]);

    expect(create).not.toHaveBeenCalled();
    expect(resolution.bindings.discord?.id).toBe("bot-1");
  });

  it("creates nothing for a schema without fields", async () => {
    const create = createStub();
    const resolver = createResourceResolver(OWNED, { create });

    const resolution = await resolver.resolve([
      { family: "schema", action: "create", name: "Lead" },
    ]);

    expect(create).not.toHaveBeenCalled();
    expect(resolution.bindings.schema).toBeUndefined();
  });

  it("falls back to the oldest owned instance for an unmatched use", async () => {
    const resolver = createResourceResolver(OWNED, {});

    const resolution = await resolver.resolve([
      { family: "dataset", action: "use", name: "Nothing like this" },
    ]);

    expect(resolution.bindings.dataset?.id).toBe("ds-1");
  });

  it("creates on use when the org owns none of a creatable family", async () => {
    const create = createStub();
    const resolver = createResourceResolver(OWNED, { create });

    const resolution = await resolver.resolve([
      { family: "queue", action: "use", name: "Jobs" },
    ]);

    // The model said "use" but there is nothing to use; a created queue named
    // what was asked for beats a saved workflow with a hole in it.
    expect(create).toHaveBeenCalledTimes(1);
    expect(resolution.bindings.queue?.name).toBe("Jobs");
  });

  it("leaves the family unbound when creation is impossible", async () => {
    const resolver = createResourceResolver(OWNED, {});

    const resolution = await resolver.resolve([
      { family: "queue", action: "create", name: "Jobs" },
    ]);

    expect(resolution.bindings.queue).toBeUndefined();
    expect(resolution.created).toEqual([]);
  });

  it("lets the brief's accepted choice win over the draft", async () => {
    const create = createStub();
    const resolver = createResourceResolver(OWNED, {
      create,
      briefBindings: [
        {
          blankId: "source",
          family: "dataset",
          binding: { kind: "existing", resourceId: "ds-2", name: "Support KB" },
        },
      ],
    });

    const resolution = await resolver.resolve([
      { family: "dataset", action: "use", name: "Product docs" },
    ]);

    expect(resolution.bindings.dataset?.id).toBe("ds-2");
  });

  it("realizes a brief-level create with the draft's name and purpose", async () => {
    const create = createStub();
    const resolver = createResourceResolver(OWNED, {
      create,
      briefBindings: [
        {
          blankId: "store",
          family: "queue",
          binding: { kind: "create", name: "a new queue" },
        },
      ],
    });

    const resolution = await resolver.resolve([
      {
        family: "queue",
        action: "use",
        name: "Lead queue",
        description: "Holds enriched leads",
      },
    ]);

    // The brief committed to creating; the draft supplied the words worth
    // keeping — so the row is named by the draft, not "a new queue".
    expect(create).toHaveBeenCalledWith("queue", {
      name: "Lead queue",
      description: "Holds enriched leads",
    });
    expect(resolution.bindings.queue?.name).toBe("Lead queue");
  });

  it("realizes a brief-level create the draft never mentioned", async () => {
    const create = createStub();
    const resolver = createResourceResolver(OWNED, {
      create,
      briefBindings: [
        {
          blankId: "store",
          family: "queue",
          binding: { kind: "create", name: "a new queue" },
        },
      ],
    });

    const resolution = await resolver.resolve([]);

    expect(create).toHaveBeenCalledWith("queue", { name: "a new queue" });
    expect(resolution.bindings.queue).toBeDefined();
  });

  it("survives a failing creator by leaving the family unbound", async () => {
    const create = vi.fn(async () => {
      throw new Error("D1 is having a day");
    });
    const resolver = createResourceResolver(OWNED, { create });

    const resolution = await resolver.resolve([
      { family: "queue", action: "create", name: "Jobs" },
    ]);

    expect(resolution.bindings.queue).toBeUndefined();
    expect(resolution.created).toEqual([]);
  });
});
