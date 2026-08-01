/**
 * Parameter conversion sits on the boundary every value crosses twice: once
 * from stored/API form into what a node's `execute` receives, and once back.
 * A silent mistranslation here surfaces as a baffling failure inside some
 * unrelated node, so these tests pin the conversion table down type by type.
 */

import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { InMemoryObjectStore } from "./__test-stubs__/runtime-harness";
import {
  apiInputsToNode,
  apiToNodeParameter,
  nodeOutputsToApi,
  nodeToApiParameter,
} from "./parameter-mapper";
import type { SchemaService } from "./schema-service";

const ORG = "org-1";
const EXEC = "exec-1";

/** Builds a node whose inputs/outputs carry the given types. */
function nodeWith(
  inputs: Array<{ name: string; type: string; repeated?: boolean }>,
  outputs: Array<{ name: string; type: string; repeated?: boolean }> = []
): Node {
  return {
    id: "n1",
    name: "n1",
    type: "test",
    position: { x: 0, y: 0 },
    inputs,
    outputs,
  } as Node;
}

const blob = (text: string, mimeType = "image/png") => ({
  data: new TextEncoder().encode(text),
  mimeType,
});

describe("scalar converters", () => {
  describe("string", () => {
    it("round-trips a string", async () => {
      expect(await nodeToApiParameter("string", "hello")).toBe("hello");
      expect(await apiToNodeParameter("string", "hello")).toBe("hello");
    });

    it("drops a value of the wrong type rather than coercing it", async () => {
      expect(await nodeToApiParameter("string", 42)).toBeUndefined();
      expect(await apiToNodeParameter("string", true)).toBeUndefined();
    });

    it("preserves the empty string", async () => {
      expect(await nodeToApiParameter("string", "")).toBe("");
    });
  });

  describe("number", () => {
    it("round-trips numbers including zero", async () => {
      expect(await nodeToApiParameter("number", 0)).toBe(0);
      expect(await nodeToApiParameter("number", -1.5)).toBe(-1.5);
      expect(await apiToNodeParameter("number", 7)).toBe(7);
    });

    it("does not parse numeric strings", async () => {
      expect(await apiToNodeParameter("number", "7")).toBeUndefined();
    });

    it("passes NaN through as a number", async () => {
      // typeof NaN === "number"; documenting rather than endorsing.
      expect(await nodeToApiParameter("number", Number.NaN)).toBeNaN();
    });
  });

  describe("boolean", () => {
    it("round-trips both booleans", async () => {
      expect(await nodeToApiParameter("boolean", false)).toBe(false);
      expect(await apiToNodeParameter("boolean", true)).toBe(true);
    });

    it("does not coerce truthy values", async () => {
      expect(await apiToNodeParameter("boolean", 1)).toBeUndefined();
      expect(await apiToNodeParameter("boolean", "true")).toBeUndefined();
    });
  });

  describe("date", () => {
    it("normalises an ISO string", async () => {
      expect(await nodeToApiParameter("date", "2024-03-01T00:00:00.000Z")).toBe(
        "2024-03-01T00:00:00.000Z"
      );
    });

    it("normalises an epoch number to ISO", async () => {
      expect(await nodeToApiParameter("date", 0)).toBe(
        "1970-01-01T00:00:00.000Z"
      );
      expect(await apiToNodeParameter("date", 0)).toBe(
        "1970-01-01T00:00:00.000Z"
      );
    });

    it("normalises a Date instance on the way out", async () => {
      const value = new Date("2024-03-01T12:00:00.000Z");
      expect(await nodeToApiParameter("date", value)).toBe(
        "2024-03-01T12:00:00.000Z"
      );
    });

    it("rejects an unparseable date", async () => {
      expect(await nodeToApiParameter("date", "not-a-date")).toBeUndefined();
      expect(await apiToNodeParameter("date", "not-a-date")).toBeUndefined();
    });
  });

  it("treats secret and database as opaque strings", async () => {
    for (const type of ["secret", "database"]) {
      expect(await nodeToApiParameter(type, "value")).toBe("value");
      expect(await apiToNodeParameter(type, 1)).toBeUndefined();
    }
  });

  it("throws on an unknown parameter type", async () => {
    await expect(nodeToApiParameter("nope", "x")).rejects.toThrow(
      /No converter for type: nope/
    );
    await expect(apiToNodeParameter("nope", "x")).rejects.toThrow(
      /No converter for type: nope/
    );
  });
});

describe("json-family converters", () => {
  it("parses a JSON string coming into a node", async () => {
    expect(await apiToNodeParameter("json", '{"a":1}')).toEqual({ a: 1 });
    expect(await apiToNodeParameter("json", "[1,2]")).toEqual([1, 2]);
  });

  it("falls back to the raw string when it is not JSON", async () => {
    expect(await apiToNodeParameter("json", "plain text")).toBe("plain text");
  });

  it("passes structured values straight through", async () => {
    const value = { nested: { list: [1, 2] } };
    expect(await nodeToApiParameter("json", value)).toEqual(value);
    expect(await apiToNodeParameter("json", value)).toEqual(value);
  });

  it("applies the same treatment to every geo type", async () => {
    const geoTypes = [
      "point",
      "multipoint",
      "linestring",
      "multilinestring",
      "polygon",
      "multipolygon",
      "geometry",
      "geometrycollection",
      "feature",
      "featurecollection",
      "geojson",
    ];
    const geometry = { type: "Point", coordinates: [1, 2] };

    for (const type of geoTypes) {
      expect(await nodeToApiParameter(type, geometry)).toEqual(geometry);
      expect(await apiToNodeParameter(type, JSON.stringify(geometry))).toEqual(
        geometry
      );
    }
  });
});

describe("blob converters", () => {
  it("writes bytes to the object store and returns a reference", async () => {
    const store = new InMemoryObjectStore();
    const ref = await nodeToApiParameter(
      "image",
      blob("pixels"),
      store,
      ORG,
      EXEC
    );

    expect(ref).toMatchObject({ mimeType: "image/png" });
    expect(store.size).toBe(1);
  });

  it("reads a reference back into bytes", async () => {
    const store = new InMemoryObjectStore();
    const ref = await nodeToApiParameter(
      "image",
      blob("pixels"),
      store,
      ORG,
      EXEC
    );
    const restored = (await apiToNodeParameter("image", ref, store)) as {
      data: Uint8Array;
      mimeType: string;
    };

    expect(new TextDecoder().decode(restored.data)).toBe("pixels");
    expect(restored.mimeType).toBe("image/png");
  });

  it("preserves a filename across the round trip", async () => {
    const store = new InMemoryObjectStore();
    const ref = await nodeToApiParameter(
      "document",
      { ...blob("doc", "application/pdf"), filename: "report.pdf" },
      store,
      ORG,
      EXEC
    );
    const restored = (await apiToNodeParameter("document", ref, store)) as {
      filename?: string;
    };

    expect(restored.filename).toBe("report.pdf");
  });

  it("infers the node-side blob flavour from the mime type", async () => {
    const store = new InMemoryObjectStore();
    const cases: Array<[string, string]> = [
      ["image/png", "image"],
      ["audio/mpeg", "audio"],
      ["video/mp4", "video"],
      ["model/gltf-binary", "gltf"],
      ["application/pdf", "document"],
    ];

    for (const [mimeType, type] of cases) {
      const ref = await nodeToApiParameter(
        type,
        blob("x", mimeType),
        store,
        ORG,
        EXEC
      );
      const restored = (await apiToNodeParameter(type, ref, store)) as {
        mimeType: string;
      };
      expect(restored.mimeType).toBe(mimeType);
    }
  });

  it("returns undefined for a reference that no longer exists", async () => {
    const store = new InMemoryObjectStore();
    expect(
      await apiToNodeParameter(
        "image",
        { id: "missing", mimeType: "image/png" },
        store
      )
    ).toBeUndefined();
  });

  it("rejects a non-blob value instead of storing garbage", async () => {
    const store = new InMemoryObjectStore();
    expect(
      await nodeToApiParameter("image", "not a blob", store, ORG, EXEC)
    ).toBeUndefined();
    expect(store.size).toBe(0);
  });

  it("fails loudly when the object store is missing", async () => {
    await expect(
      nodeToApiParameter("image", blob("x"), undefined, ORG, EXEC)
    ).rejects.toThrow(/ObjectStore and organizationId required/);
  });

  it("fails loudly when the organization is missing", async () => {
    const store = new InMemoryObjectStore();
    await expect(
      nodeToApiParameter("image", blob("x"), store, undefined, EXEC)
    ).rejects.toThrow(/ObjectStore and organizationId required/);
  });
});

describe("schema converter", () => {
  const schema = { name: "Person", fields: [{ name: "age", type: "number" }] };

  it("passes an already-resolved schema object through", async () => {
    expect(await apiToNodeParameter("schema", schema)).toEqual(schema);
  });

  const schemaServiceFor = (known: Record<string, typeof schema>) =>
    ({
      resolve: async (id: string, organizationId: string) =>
        organizationId === ORG ? known[id] : undefined,
    }) as unknown as SchemaService;

  it("resolves a schema id via the schema service", async () => {
    expect(
      await apiToNodeParameter("schema", "s1", undefined, {
        schemaService: schemaServiceFor({ s1: schema }),
        organizationId: ORG,
      })
    ).toEqual(schema);
  });

  it("throws when the id resolves to nothing, rather than passing undefined on", async () => {
    // A schema the caller cannot access must not silently become "no schema";
    // the node would then validate against nothing at all.
    await expect(
      apiToNodeParameter("schema", "missing", undefined, {
        schemaService: schemaServiceFor({}),
        organizationId: ORG,
      })
    ).rejects.toThrow(/not found or access denied/);
  });

  it("does not leak a schema across organizations", async () => {
    await expect(
      apiToNodeParameter("schema", "s1", undefined, {
        schemaService: schemaServiceFor({ s1: schema }),
        organizationId: "other-org",
      })
    ).rejects.toThrow(/not found or access denied/);
  });

  it("yields undefined when no schema service is wired up", async () => {
    expect(await apiToNodeParameter("schema", "s1")).toBeUndefined();
  });
});

describe("nodeOutputsToApi", () => {
  it("maps each output using its declared type", async () => {
    const node = nodeWith(
      [],
      [
        { name: "text", type: "string" },
        { name: "count", type: "number" },
      ]
    );

    expect(
      await nodeOutputsToApi(node, { text: "hi", count: 3 }, undefined, ORG)
    ).toEqual({ text: "hi", count: 3 });
  });

  it("maps a repeated output element-wise", async () => {
    const node = nodeWith(
      [],
      [{ name: "tags", type: "string", repeated: true }]
    );

    expect(
      await nodeOutputsToApi(node, { tags: ["a", "b"] }, undefined, ORG)
    ).toEqual({ tags: ["a", "b"] });
  });

  it("treats an array on a non-repeated output as one json value", async () => {
    // The array is the value, not a list of values — converting element-wise
    // here would corrupt any node that returns a JSON array.
    const node = nodeWith([], [{ name: "data", type: "json" }]);

    expect(
      await nodeOutputsToApi(node, { data: [1, 2, 3] }, undefined, ORG)
    ).toEqual({ data: [1, 2, 3] });
  });

  it("falls back to string for an output the node never declared", async () => {
    const node = nodeWith([], []);
    expect(
      await nodeOutputsToApi(node, { stray: "value" }, undefined, ORG)
    ).toEqual({ stray: "value" });
  });

  it("stores each element of a repeated blob output", async () => {
    const store = new InMemoryObjectStore();
    const node = nodeWith(
      [],
      [{ name: "images", type: "image", repeated: true }]
    );

    const mapped = await nodeOutputsToApi(
      node,
      { images: [blob("a"), blob("b")] },
      store,
      ORG,
      EXEC
    );

    expect(mapped.images).toHaveLength(2);
    expect(store.size).toBe(2);
  });

  it("returns an empty record for a node that emitted nothing", async () => {
    expect(
      await nodeOutputsToApi(nodeWith([], []), {}, undefined, ORG)
    ).toEqual({});
  });
});

describe("apiInputsToNode", () => {
  it("maps each input using its declared type", async () => {
    const node = nodeWith([
      { name: "text", type: "string" },
      { name: "payload", type: "json" },
    ]);

    expect(
      await apiInputsToNode(node, { text: "hi", payload: '{"a":1}' })
    ).toEqual({ text: "hi", payload: { a: 1 } });
  });

  it("maps an array input element-wise", async () => {
    const node = nodeWith([{ name: "items", type: "string", repeated: true }]);

    expect(await apiInputsToNode(node, { items: ["a", "b"] })).toEqual({
      items: ["a", "b"],
    });
  });

  it("resolves each element of a repeated blob input", async () => {
    const store = new InMemoryObjectStore();
    const outputNode = nodeWith(
      [],
      [{ name: "images", type: "image", repeated: true }]
    );
    const stored = await nodeOutputsToApi(
      outputNode,
      { images: [blob("first"), blob("second")] },
      store,
      ORG,
      EXEC
    );

    const inputNode = nodeWith([
      { name: "images", type: "image", repeated: true },
    ]);
    const resolved = (await apiInputsToNode(
      inputNode,
      { images: stored.images },
      store
    )) as { images: Array<{ data: Uint8Array }> };

    expect(
      resolved.images.map((i) => new TextDecoder().decode(i.data))
    ).toEqual(["first", "second"]);
  });

  it("falls back to string for an input the node never declared", async () => {
    expect(await apiInputsToNode(nodeWith([]), { stray: "value" })).toEqual({
      stray: "value",
    });
  });

  it("returns an empty record when there are no inputs", async () => {
    expect(await apiInputsToNode(nodeWith([]), {})).toEqual({});
  });
});
