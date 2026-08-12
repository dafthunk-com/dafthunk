import type { Field } from "@dafthunk/types";
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

/**
 * A create stub that mints predictable ids. Fields travel back the way the
 * real provisioner returns them — a created schema whose fields were dropped
 * would bind an id onto a node with no ports to wire.
 */
function createStub() {
  let counter = 0;
  return vi.fn(
    async (
      _type: string,
      spec: { name: string; description?: string; fields?: Field[] }
    ) => ({
      id: `new-${++counter}`,
      name: spec.name,
      ...(spec.fields ? { fields: spec.fields } : {}),
    })
  );
}

const ENQUIRY_FIELDS: Field[] = [
  { name: "email", type: "string", required: true },
  { name: "question", type: "string" },
];

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

  /**
   * Schemas resolve on their own terms, because a schema is a shape rather
   * than a place: the fields become the node's ports, so the wrong one is a
   * miswired graph, and a second row costs nothing but a line in a list.
   */
  describe("schemas", () => {
    const withSchemas = (fields: Field[]): OrgResources => ({
      ...OWNED,
      schema: [{ id: "sch-1", name: "enquiry", fields }],
    });

    it("reuses the workspace's own when the shape and the name both match", async () => {
      const create = createStub();
      const resolver = createResourceResolver(withSchemas(ENQUIRY_FIELDS), {
        create,
      });

      const resolution = await resolver.resolve([
        {
          family: "schema",
          action: "create",
          name: "Enquiry",
          nodeId: "trigger",
          // Same fields, stated in the other order: order is a presentation
          // choice, not part of what the shape is.
          fields: [...ENQUIRY_FIELDS].reverse(),
        },
      ]);

      expect(create).not.toHaveBeenCalled();
      expect(resolution.schemasByNode.get("trigger")?.id).toBe("sch-1");
    });

    it("creates when the shape matches under a different name", async () => {
      const create = createStub();
      const resolver = createResourceResolver(withSchemas(ENQUIRY_FIELDS), {
        create,
      });

      const resolution = await resolver.resolve([
        {
          family: "schema",
          action: "create",
          name: "Support request",
          nodeId: "trigger",
          fields: ENQUIRY_FIELDS,
        },
      ]);

      // The schema is what the user will see on their form and in their
      // Schemas list; the same shape under someone else's word for it reads
      // as a workflow about something else.
      expect(resolution.schemasByNode.get("trigger")?.id).toBe("new-1");
      expect(create).toHaveBeenCalledWith(
        "schema",
        expect.objectContaining({ name: "Support_request" })
      );
    });

    it("creates under a free name when the name is taken by another shape", async () => {
      const create = createStub();
      const resolver = createResourceResolver(withSchemas(ENQUIRY_FIELDS), {
        create,
      });

      const resolution = await resolver.resolve([
        {
          family: "schema",
          action: "create",
          name: "enquiry",
          nodeId: "trigger",
          fields: [{ name: "subject", type: "string" }],
        },
      ]);

      expect(resolution.schemasByNode.get("trigger")?.id).toBe("new-1");
      expect(create).toHaveBeenCalledWith(
        "schema",
        expect.objectContaining({ name: "enquiry_2" })
      );
    });

    it("gives each node its own shape", async () => {
      const create = createStub();
      const resolver = createResourceResolver(OWNED, { create });

      const resolution = await resolver.resolve([
        {
          family: "schema",
          action: "create",
          name: "Enquiry",
          nodeId: "trigger",
          fields: ENQUIRY_FIELDS,
        },
        {
          family: "schema",
          action: "create",
          name: "Answer",
          nodeId: "responder",
          fields: [{ name: "reply", type: "string" }],
        },
      ]);

      expect(resolution.schemasByNode.get("trigger")?.id).toBe("new-1");
      expect(resolution.schemasByNode.get("responder")?.id).toBe("new-2");
      // Nothing family-wide: a shape belongs to the node that reads it.
      expect(resolution.bindings.schema).toBeUndefined();
    });

    it("creates one row for one shape, however it is renamed between rounds", async () => {
      const create = createStub();
      const resolver = createResourceResolver(OWNED, { create });

      const first = await resolver.resolve([
        {
          family: "schema",
          action: "create",
          name: "Enquiry",
          nodeId: "trigger",
          fields: ENQUIRY_FIELDS,
        },
      ]);
      // The repair round re-emits the same shape under a drifting name; the
      // model reshapes a record far less readily than it renames one.
      const second = await resolver.resolve([
        {
          family: "schema",
          action: "create",
          name: "Visitor enquiry",
          nodeId: "trigger",
          fields: ENQUIRY_FIELDS,
        },
      ]);

      expect(create).toHaveBeenCalledTimes(1);
      expect(second.schemasByNode.get("trigger")?.id).toBe(
        first.schemasByNode.get("trigger")?.id
      );
    });

    it("never falls back to a schema the workspace happens to own", async () => {
      const create = createStub();
      const resolver = createResourceResolver(withSchemas(ENQUIRY_FIELDS), {
        create,
      });

      const resolution = await resolver.resolve([
        { family: "schema", action: "use", name: "Nothing like this" },
      ]);

      expect(create).not.toHaveBeenCalled();
      expect(resolution.bindings.schema).toBeUndefined();
      expect(resolution.schemasByNode.size).toBe(0);
    });

    it("does not match a name by substring", async () => {
      const create = createStub();
      const resolver = createResourceResolver(
        {
          ...OWNED,
          schema: [
            { id: "sch-1", name: "enquiry_archive", fields: ENQUIRY_FIELDS },
          ],
        },
        { create }
      );

      const resolution = await resolver.resolve([
        {
          family: "schema",
          action: "create",
          name: "enquiry",
          nodeId: "trigger",
          fields: ENQUIRY_FIELDS,
        },
      ]);

      expect(resolution.schemasByNode.get("trigger")?.id).toBe("new-1");
    });

    it("treats a shape named for no node as the workflow's default", async () => {
      const create = createStub();
      const resolver = createResourceResolver(OWNED, { create });

      const resolution = await resolver.resolve([
        {
          family: "schema",
          action: "create",
          name: "Enquiry",
          fields: ENQUIRY_FIELDS,
        },
      ]);

      expect(resolution.bindings.schema?.id).toBe("new-1");
      expect(resolution.schemasByNode.size).toBe(0);
    });
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
