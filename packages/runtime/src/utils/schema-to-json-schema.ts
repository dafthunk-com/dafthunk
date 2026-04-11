import type { FieldType, Schema } from "@dafthunk/types";

/**
 * Maps internal FieldType to JSON Schema type.
 */
const FIELD_TYPE_MAP: Record<FieldType, string> = {
  string: "string",
  integer: "integer",
  number: "number",
  boolean: "boolean",
  datetime: "string",
  json: "object",
};

/**
 * Converts an internal Schema definition (fields-based) to a standard
 * JSON Schema object suitable for LLM structured output APIs.
 */
export function schemaToJsonSchema(schema: Schema): Record<string, unknown> {
  const properties: Record<string, Record<string, unknown>> = {};
  const required: string[] = [];

  for (const field of schema.fields) {
    const prop: Record<string, unknown> = {
      type: FIELD_TYPE_MAP[field.type] ?? "string",
    };
    if (field.type === "datetime") {
      prop.format = "date-time";
    }
    if (field.label) {
      prop.description = field.label;
    }
    if (field.defaultValue !== undefined) {
      prop.default = field.defaultValue;
    }
    properties[field.name] = prop;
    if (field.required) {
      required.push(field.name);
    }
  }

  return {
    type: "object",
    properties,
    ...(required.length > 0 && { required }),
    additionalProperties: false,
  };
}
