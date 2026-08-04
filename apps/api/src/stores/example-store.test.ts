import type { ObjectStore } from "@dafthunk/runtime";
import type { ObjectReference, WorkflowExample } from "@dafthunk/types";
import { describe, expect, it, vi } from "vitest";

import type { Bindings } from "../context";
import { collectObjectReferences, ExampleStore } from "./example-store";

/** In-memory R2 stand-in covering only what ExampleStore uses. */
function fakeBucket() {
  const store = new Map<string, string>();
  return {
    store,
    bucket: {
      get: async (key: string) => {
        const body = store.get(key);
        if (body === undefined) return null;
        return { json: async () => JSON.parse(body) };
      },
      put: async (key: string, value: string) => {
        store.set(key, value);
      },
      delete: async (key: string) => {
        store.delete(key);
      },
    } as unknown as R2Bucket,
  };
}

function fakeObjectStore() {
  const deleted: string[] = [];
  return {
    deleted,
    objectStore: {
      deleteObject: async (reference: ObjectReference) => {
        deleted.push(reference.id);
      },
    } as unknown as ObjectStore,
  };
}

function example(overrides: Partial<WorkflowExample> = {}): WorkflowExample {
  return {
    id: "ex-1",
    name: "Default",
    isDefault: true,
    nodeValues: {},
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

const IMAGE: ObjectReference = { id: "img-1", mimeType: "image/png" };

describe("ExampleStore", () => {
  it("returns an empty list when nothing has been saved", async () => {
    const { bucket } = fakeBucket();
    const store = new ExampleStore({ RESSOURCES: bucket } as Bindings);

    expect(await store.list("wf-1")).toEqual([]);
  });

  it("round-trips examples, restoring dates from JSON", async () => {
    const { bucket } = fakeBucket();
    const store = new ExampleStore({ RESSOURCES: bucket } as Bindings);

    await store.save("wf-1", [
      example({ nodeValues: { "node-a": { value: "hello" } } }),
    ]);
    const [loaded] = await store.list("wf-1");

    expect(loaded.name).toBe("Default");
    expect(loaded.nodeValues["node-a"].value).toBe("hello");
    // JSON turns these into strings; the store must hand back Dates.
    expect(loaded.createdAt).toBeInstanceOf(Date);
    expect(loaded.updatedAt).toBeInstanceOf(Date);
  });

  it("keeps examples per workflow", async () => {
    const { bucket } = fakeBucket();
    const store = new ExampleStore({ RESSOURCES: bucket } as Bindings);

    await store.save("wf-1", [example({ name: "One" })]);
    await store.save("wf-2", [example({ name: "Two" })]);

    expect((await store.list("wf-1"))[0].name).toBe("One");
    expect((await store.list("wf-2"))[0].name).toBe("Two");
  });

  it("deletes referenced objects along with the document", async () => {
    const { bucket, store: keys } = fakeBucket();
    const { objectStore, deleted } = fakeObjectStore();
    const store = new ExampleStore({ RESSOURCES: bucket } as Bindings);

    await store.save("wf-1", [
      example({ nodeValues: { "node-a": { value: IMAGE } } }),
    ]);
    await store.delete("wf-1", objectStore);

    expect(deleted).toEqual(["img-1"]);
    expect(keys.size).toBe(0);
  });

  it("still removes the document when an object delete fails", async () => {
    const { bucket, store: keys } = fakeBucket();
    const store = new ExampleStore({ RESSOURCES: bucket } as Bindings);
    const objectStore = {
      deleteObject: vi.fn(async () => {
        throw new Error("R2 unavailable");
      }),
    } as unknown as ObjectStore;

    await store.save("wf-1", [
      example({ nodeValues: { "node-a": { value: IMAGE } } }),
    ]);
    await store.delete("wf-1", objectStore);

    // Leaving the document behind would mean the next attempt has no record of
    // what to clean up.
    expect(keys.size).toBe(0);
  });
});

describe("collectObjectReferences", () => {
  it("finds references in node values and in the trigger payload", () => {
    const attachment: ObjectReference = {
      id: "att-1",
      mimeType: "application/pdf",
    };

    const found = collectObjectReferences([
      example({
        nodeValues: { "node-a": { value: IMAGE } },
        trigger: { attachments: [attachment] },
      }),
    ]);

    expect(found.map((r) => r.id).sort()).toEqual(["att-1", "img-1"]);
  });

  it("deduplicates the same object used twice", () => {
    const found = collectObjectReferences([
      example({
        id: "a",
        nodeValues: { "node-a": { value: IMAGE }, "node-b": { value: IMAGE } },
      }),
      example({ id: "b", nodeValues: { "node-c": { value: IMAGE } } }),
    ]);

    expect(found).toHaveLength(1);
  });

  it("ignores plain values that merely look nested", () => {
    expect(
      collectObjectReferences([
        example({
          nodeValues: {
            "node-a": { value: { id: 42, mimeType: null }, other: "text" },
          },
        }),
      ])
    ).toEqual([]);
  });
});
