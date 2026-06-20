import type { Field } from "@dafthunk/types";

/**
 * Metadata key under which a copy node (schema-compose / schema-extract)
 * stamps the field-shape signature of the schema it last derived its
 * handles from. Compared against the live schema to detect silent drift.
 */
export const SCHEMA_FIELDS_HASH_KEY = "_schema_fields_hash";

/**
 * Stable signature of the parts of a schema that a copy node materializes
 * into input/output handles: each field's name and type, in order.
 *
 * Deliberately ignores name/description and field attributes (required,
 * primaryKey, …) that don't change the derived handles, so a cosmetic schema
 * edit doesn't flag wired nodes as stale.
 */
export function hashSchemaFields(fields: Field[]): string {
  return fields.map((f) => `${f.name}:${f.type}`).join("|");
}
