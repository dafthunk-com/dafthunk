import type { WorkflowExample } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import {
  applyDefaultExclusivity,
  checkName,
  checkNewExample,
  checkUpload,
  ensureDefault,
  MAX_EXAMPLES_PER_WORKFLOW,
} from "./example-rules";
import { MAX_FORM_FILE_BYTES } from "./form-upload";

function example(over: Partial<WorkflowExample> = {}): WorkflowExample {
  return {
    id: "ex-1",
    name: "Default",
    isDefault: false,
    nodeValues: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  };
}

describe("checkNewExample", () => {
  it("accepts a fresh name", () => {
    expect(checkNewExample([example({ name: "A" })], "B")).toBeNull();
  });

  it("rejects a duplicate name with a conflict", () => {
    expect(checkNewExample([example({ name: "A" })], "A")).toMatchObject({
      status: 409,
    });
  });

  it("rejects once the per-workflow cap is reached", () => {
    const full = Array.from({ length: MAX_EXAMPLES_PER_WORKFLOW }, (_, i) =>
      example({ id: `ex-${i}`, name: `Example ${i}` })
    );

    expect(checkNewExample(full, "One more")).toMatchObject({ status: 400 });
  });
});

describe("checkName", () => {
  const examples = [
    example({ id: "a", name: "A" }),
    example({ id: "b", name: "B" }),
  ];

  it("allows an example to keep its own name", () => {
    expect(checkName(examples, "A", "a")).toBeNull();
  });

  it("rejects taking another example's name", () => {
    expect(checkName(examples, "B", "a")).toMatchObject({ status: 409 });
  });

  it("ignores an update that does not rename", () => {
    expect(checkName(examples, undefined, "a")).toBeNull();
  });
});

describe("checkUpload", () => {
  it("accepts an image for an image input", () => {
    expect(checkUpload(1024, "image/png", "image")).toBeNull();
  });

  it("rejects a MIME type that does not match the input", () => {
    expect(checkUpload(1024, "text/plain", "image")).toMatchObject({
      status: 400,
    });
  });

  it("accepts anything for a document or blob input", () => {
    expect(checkUpload(1024, "application/zip", "document")).toBeNull();
    expect(checkUpload(1024, "application/zip", "blob")).toBeNull();
  });

  it("rejects a file over the size cap", () => {
    const failure = checkUpload(MAX_FORM_FILE_BYTES + 1, "image/png", "image");

    expect(failure?.status).toBe(400);
    expect(failure?.message).toContain("25MB");
  });

  it("accepts a file exactly at the cap", () => {
    expect(checkUpload(MAX_FORM_FILE_BYTES, "image/png", "image")).toBeNull();
  });
});

describe("applyDefaultExclusivity", () => {
  it("leaves exactly one default", () => {
    const result = applyDefaultExclusivity(
      [
        example({ id: "a", isDefault: true }),
        example({ id: "b", isDefault: true }),
        example({ id: "c" }),
      ],
      "b"
    );

    expect(result.filter((e) => e.isDefault).map((e) => e.id)).toEqual(["b"]);
  });
});

describe("ensureDefault", () => {
  it("promotes the first example when the default was deleted", () => {
    const result = ensureDefault([example({ id: "a" }), example({ id: "b" })]);

    // Otherwise a workflow has examples but Run has nothing to pick, which
    // reads as the feature being broken.
    expect(result.filter((e) => e.isDefault).map((e) => e.id)).toEqual(["a"]);
  });

  it("leaves an existing default alone", () => {
    const result = ensureDefault([
      example({ id: "a" }),
      example({ id: "b", isDefault: true }),
    ]);

    expect(result.filter((e) => e.isDefault).map((e) => e.id)).toEqual(["b"]);
  });

  it("does nothing when there are no examples", () => {
    expect(ensureDefault([])).toEqual([]);
  });
});
