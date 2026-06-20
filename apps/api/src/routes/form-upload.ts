/**
 * Form upload helpers
 *
 * Turns a submitted multipart form into a record, uploading each blob field's
 * file to R2 and replacing it with an ObjectReference. Kept separate from the
 * route wiring so it can be unit tested with an in-memory ObjectStore.
 */

import type { ObjectStore } from "@dafthunk/runtime";
import {
  type Field,
  isBlobFieldType,
  type ObjectReference,
} from "@dafthunk/types";

/** Max size for a single uploaded form file (25 MB). */
export const MAX_FORM_FILE_BYTES = 25 * 1024 * 1024;

/**
 * Validates an uploaded file's MIME type against a blob field type. Media
 * types are checked by prefix; `document`/`blob` accept anything.
 */
export function mimeMatchesFieldType(
  mimeType: string,
  fieldType: string
): boolean {
  switch (fieldType) {
    case "image":
      return mimeType.startsWith("image/");
    case "audio":
      return mimeType.startsWith("audio/");
    case "video":
      return mimeType.startsWith("video/");
    default:
      return true; // document, blob
  }
}

/**
 * Builds the submitted record from a multipart form: non-file values arrive
 * JSON-encoded in the `_data` part, while each blob field is uploaded to R2
 * and replaced with its ObjectReference. Throws on an oversized file or a
 * MIME type that doesn't match the field.
 */
export async function buildMultipartRecord(
  form: FormData,
  fields: Field[],
  organizationId: string,
  objectStore: ObjectStore
): Promise<Record<string, unknown>> {
  const dataPart = form.get("_data");
  const record: Record<string, unknown> =
    typeof dataPart === "string" ? JSON.parse(dataPart) : {};

  for (const field of fields) {
    if (!isBlobFieldType(field.type)) continue;
    const file = form.get(field.name);
    if (!(file instanceof File)) continue; // missing optional upload

    if (file.size > MAX_FORM_FILE_BYTES) {
      throw new Error(
        `File for '${field.name}' exceeds the ${MAX_FORM_FILE_BYTES / (1024 * 1024)}MB limit.`
      );
    }
    const mimeType = file.type || "application/octet-stream";
    if (!mimeMatchesFieldType(mimeType, field.type)) {
      throw new Error(
        `File for '${field.name}' must be a ${field.type} (got ${mimeType}).`
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const reference: ObjectReference = await objectStore.writeObject(
      bytes,
      mimeType,
      organizationId,
      undefined,
      file.name || undefined
    );
    record[field.name] = reference;
  }

  return record;
}
