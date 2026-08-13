import type { Field } from "@dafthunk/types";
import { FIELD_TYPES, IDENTIFIER_PATTERN } from "@dafthunk/types";
import { toSchemaName } from "@dafthunk/utils";
import { v7 as uuid } from "uuid";

import type { CreateResourceFn } from "../agents/workflow-generator";
import type { createDatabase } from "../db";
import {
  createDatabaseRecord,
  createDataset,
  createEmail,
  createQueue,
  createSchemaRecord,
} from "../db/queries";
import { withUniqueHandle } from "../utils/email-handle";

/**
 * Brings workspace components into being on the generator's behalf.
 *
 * Every row lands exactly where a hand-made one would — the Datasets page,
 * the Queues page — with the description the model proposed, so the user can
 * rename or delete it like anything else they own. Nothing here is special;
 * that is the point.
 */

/** Database names must be identifiers; a proposed name is coerced, not refused. */
function toIdentifier(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
  const identifier = cleaned || "database";
  return IDENTIFIER_PATTERN.test(identifier) ? identifier : `_${identifier}`;
}

/**
 * Keeps only the fields a schema row can actually hold: identifier names,
 * known types. The model's extras (labels, requireds) pass through when the
 * basics are sound.
 */
function sanitizeSchemaFields(fields: Field[]): Field[] {
  const validTypes = new Set<string>(FIELD_TYPES);
  return fields.filter(
    (field) =>
      field &&
      typeof field.name === "string" &&
      IDENTIFIER_PATTERN.test(field.name) &&
      typeof field.type === "string" &&
      validTypes.has(field.type)
  );
}

export function createResourceProvisioner(
  db: ReturnType<typeof createDatabase>,
  organizationId: string
): CreateResourceFn {
  return async (type, spec) => {
    const now = new Date();
    const name = spec.name.trim();
    const description = spec.description?.trim() ?? "";
    const base = { organizationId, createdAt: now, updatedAt: now };

    switch (type) {
      case "dataset": {
        const row = await createDataset(db, {
          id: uuid(),
          name,
          description,
          ...base,
        });
        return { id: row.id, name: row.name };
      }
      case "queue": {
        const row = await createQueue(db, {
          id: uuid(),
          name,
          description,
          ...base,
        });
        return { id: row.id, name: row.name };
      }
      case "database": {
        const row = await createDatabaseRecord(db, {
          id: uuid(),
          name: toIdentifier(name),
          description,
          ...base,
        });
        return { id: row.id, name: row.name };
      }
      case "schema": {
        const fields = sanitizeSchemaFields(spec.fields ?? []);
        if (fields.length === 0) {
          throw new Error("a schema needs at least one usable field");
        }
        const row = await createSchemaRecord(db, {
          id: uuid(),
          name: toSchemaName(name),
          description,
          fields: JSON.stringify(fields),
          ...base,
        });
        // Fields travel back, unlike every other family: the nodes that bind a
        // schema grow their ports from it, and a resource without them binds an
        // id onto a node with nothing to wire.
        return { id: row.id, name: row.name, fields };
      }
      case "email": {
        const created = await withUniqueHandle(name, (handle) =>
          createEmail(db, { id: uuid(), name, description, handle, ...base })
        );
        if (!created) {
          throw new Error("could not allocate a unique mailbox handle");
        }
        return { id: created.id, name: created.name, handle: created.handle };
      }
      default:
        throw new Error(`a ${type} cannot be created automatically`);
    }
  };
}
