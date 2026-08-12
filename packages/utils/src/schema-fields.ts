import type { Field } from "@dafthunk/types";
import { IDENTIFIER_PATTERN } from "@dafthunk/types";

/**
 * What "the same shape" means, in one place.
 *
 * Two very different readers need the answer. The editor asks it of a node it
 * already materialized handles for — has the schema moved under me? The
 * generator asks it of a shape it just wrote down — does the workspace already
 * own this? They want different comparisons, so both live here rather than
 * being approximated separately on either side of the wire.
 */

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

/**
 * Identity of a record shape, for deciding whether one already exists.
 *
 * Sorted, unlike `hashSchemaFields`: field order is a presentation choice, and
 * two schemas listing the same fields in a different order are the same shape.
 * `required` is in the key because it changes what a form accepts at submit
 * time — a stricter or looser twin is a different shape, not a cosmetic edit.
 */
export function schemaShapeKey(fields: Field[]): string {
  return [...fields]
    .map((field) => `${field.name}:${field.type}:${field.required ? 1 : 0}`)
    .sort()
    .join("|");
}

/**
 * A schema name coerced to what the schemas route will accept.
 *
 * `POST /schemas` requires `IDENTIFIER_PATTERN`, so a name that does not match
 * produces a row nobody can edit afterwards. Coerced rather than refused, the
 * same bargain `toIdentifier` strikes for database names.
 */
export function toSchemaName(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[^a-zA-Z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const identifier = cleaned || "schema";
  return IDENTIFIER_PATTERN.test(identifier) ? identifier : `_${identifier}`;
}
