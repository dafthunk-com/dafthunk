import type { ObjectStore } from "@dafthunk/runtime";
import type { Field, ObjectReference } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import {
  buildMultipartRecord,
  MAX_FORM_FILE_BYTES,
  mimeMatchesFieldType,
} from "./form-upload";

interface WriteCall {
  size: number;
  mimeType: string;
  organizationId: string;
  filename?: string;
}

/**
 * Minimal ObjectStore that records writeObject calls. Only writeObject is
 * exercised by buildMultipartRecord, so the rest of the interface is unused.
 */
function recordingStore() {
  const calls: WriteCall[] = [];
  const store = {
    async writeObject(
      data: Uint8Array,
      mimeType: string,
      organizationId: string,
      _executionId?: string,
      filename?: string
    ): Promise<ObjectReference> {
      calls.push({ size: data.byteLength, mimeType, organizationId, filename });
      return {
        id: `obj-${calls.length}`,
        mimeType,
        ...(filename ? { filename } : {}),
      };
    },
  } as unknown as ObjectStore;
  return { store, calls };
}

function formWith(
  data: Record<string, unknown>,
  files: Record<string, File> = {}
): FormData {
  const form = new FormData();
  form.append("_data", JSON.stringify(data));
  for (const [name, file] of Object.entries(files)) {
    form.append(name, file);
  }
  return form;
}

const ORG = "org-1";

const schema: Field[] = [
  { name: "caption", type: "string", required: true },
  { name: "photo", type: "image", required: true },
  { name: "attachment", type: "document" },
];

describe("mimeMatchesFieldType", () => {
  it("checks media types by prefix", () => {
    expect(mimeMatchesFieldType("image/png", "image")).toBe(true);
    expect(mimeMatchesFieldType("audio/mpeg", "image")).toBe(false);
    expect(mimeMatchesFieldType("video/mp4", "video")).toBe(true);
    expect(mimeMatchesFieldType("audio/wav", "audio")).toBe(true);
  });

  it("accepts anything for document and blob", () => {
    expect(mimeMatchesFieldType("application/pdf", "document")).toBe(true);
    expect(mimeMatchesFieldType("application/zip", "blob")).toBe(true);
  });
});

describe("buildMultipartRecord", () => {
  it("uploads a blob field and merges its reference with _data values", async () => {
    const { store, calls } = recordingStore();
    const photo = new File([new Uint8Array([1, 2, 3, 4])], "cat.png", {
      type: "image/png",
    });
    const form = formWith({ caption: "a cat" }, { photo });

    const record = await buildMultipartRecord(form, schema, ORG, store);

    expect(record.caption).toBe("a cat");
    expect(record.photo).toEqual({
      id: "obj-1",
      mimeType: "image/png",
      filename: "cat.png",
    });
    expect(calls).toEqual([
      {
        size: 4,
        mimeType: "image/png",
        organizationId: ORG,
        filename: "cat.png",
      },
    ]);
  });

  it("accepts any mime type for a document field", async () => {
    const { store } = recordingStore();
    const doc = new File([new Uint8Array([0])], "report.pdf", {
      type: "application/pdf",
    });
    const form = formWith(
      { caption: "x", photo: undefined },
      { attachment: doc }
    );

    const record = await buildMultipartRecord(form, schema, ORG, store);

    expect(record.attachment).toMatchObject({
      id: "obj-1",
      mimeType: "application/pdf",
    });
  });

  it("throws when a file's mime type does not match the field type", async () => {
    const { store, calls } = recordingStore();
    const wrong = new File([new Uint8Array([1])], "song.mp3", {
      type: "audio/mpeg",
    });
    const form = formWith({ caption: "x" }, { photo: wrong });

    await expect(
      buildMultipartRecord(form, schema, ORG, store)
    ).rejects.toThrow(/must be a image/);
    expect(calls).toHaveLength(0);
  });

  it("throws when a file exceeds the size limit", async () => {
    const { store } = recordingStore();
    const big = new File([new Uint8Array([1, 2, 3])], "huge.png", {
      type: "image/png",
    });
    // Shadow the read-only size getter to avoid allocating 25MB in the test.
    Object.defineProperty(big, "size", { value: MAX_FORM_FILE_BYTES + 1 });
    const form = formWith({ caption: "x" }, { photo: big });

    await expect(
      buildMultipartRecord(form, schema, ORG, store)
    ).rejects.toThrow(/exceeds/);
  });

  it("leaves an optional blob field absent when no file is uploaded", async () => {
    const { store, calls } = recordingStore();
    const photo = new File([new Uint8Array([1])], "p.png", {
      type: "image/png",
    });
    // attachment (optional document) is not provided.
    const form = formWith({ caption: "x" }, { photo });

    const record = await buildMultipartRecord(form, schema, ORG, store);

    expect(record).not.toHaveProperty("attachment");
    expect(calls).toHaveLength(1);
  });

  it("does not upload non-blob fields", async () => {
    const { store, calls } = recordingStore();
    const form = formWith({ caption: "just text" });

    const record = await buildMultipartRecord(form, schema, ORG, store);

    expect(record).toEqual({ caption: "just text" });
    expect(calls).toHaveLength(0);
  });
});
