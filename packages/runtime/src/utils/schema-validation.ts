import type { Field, FieldType, Schema } from "@dafthunk/types";

interface SchemaResolver {
  schemaService?: {
    resolve(
      schemaId: string,
      organizationId: string
    ): Promise<Schema | undefined>;
  };
  organizationId: string;
}

interface ValidationResult {
  record: Record<string, unknown>;
  errors: string[];
}

interface BatchValidationResult {
  records: Record<string, unknown>[];
  errors: string[];
}

function coerceToString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return undefined;
}

function coerceToInteger(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isInteger(value) ? value : Math.trunc(value);
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return undefined;
}

function coerceToNumber(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return undefined;
}

function coerceToBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  return undefined;
}

function coerceToDatetime(value: unknown): string | undefined {
  if (typeof value === "string") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  if (typeof value === "number") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return undefined;
}

function coerceToJson(value: unknown): unknown | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "object") return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function coerceValue(
  value: unknown,
  targetType: FieldType
): { value: unknown; ok: boolean } {
  switch (targetType) {
    case "string": {
      const result = coerceToString(value);
      return result !== undefined
        ? { value: result, ok: true }
        : { value, ok: false };
    }
    case "integer": {
      const result = coerceToInteger(value);
      return result !== undefined
        ? { value: result, ok: true }
        : { value, ok: false };
    }
    case "number": {
      const result = coerceToNumber(value);
      return result !== undefined
        ? { value: result, ok: true }
        : { value, ok: false };
    }
    case "boolean": {
      const result = coerceToBoolean(value);
      return result !== undefined
        ? { value: result, ok: true }
        : { value, ok: false };
    }
    case "datetime": {
      const result = coerceToDatetime(value);
      return result !== undefined
        ? { value: result, ok: true }
        : { value, ok: false };
    }
    case "json": {
      const result = coerceToJson(value);
      return result !== undefined
        ? { value: result, ok: true }
        : { value, ok: false };
    }
    default:
      return { value, ok: false };
  }
}

function isCorrectType(value: unknown, type: FieldType): boolean {
  switch (type) {
    case "string":
      return typeof value === "string";
    case "integer":
      return typeof value === "number" && Number.isInteger(value);
    case "number":
      return typeof value === "number";
    case "boolean":
      return typeof value === "boolean";
    case "datetime":
      return (
        typeof value === "string" && !Number.isNaN(new Date(value).getTime())
      );
    case "json":
      return typeof value === "object" && value !== null;
    default:
      return false;
  }
}

function validateField(
  record: Record<string, unknown>,
  field: Field
): { value: unknown; error: string | null } {
  const value = record[field.name];

  if (value === null || value === undefined) {
    if (field.required) {
      return { value: null, error: `Missing required field '${field.name}'` };
    }
    return { value: null, error: null };
  }

  if (isCorrectType(value, field.type)) {
    return { value, error: null };
  }

  const coerced = coerceValue(value, field.type);
  if (coerced.ok) {
    return { value: coerced.value, error: null };
  }

  return {
    value: null,
    error: `Field '${field.name}': cannot coerce ${typeof value} to ${field.type}`,
  };
}

export function validateRecord(
  record: Record<string, unknown>,
  schema: Schema
): ValidationResult {
  const result: Record<string, unknown> = {};
  const errors: string[] = [];

  for (const field of schema.fields) {
    const { value, error } = validateField(record, field);
    result[field.name] = value;
    if (error) {
      errors.push(error);
    }
  }

  return { record: result, errors };
}

export function validateRecords(
  records: Record<string, unknown>[],
  schema: Schema
): BatchValidationResult {
  const validated: Record<string, unknown>[] = [];
  const errors: string[] = [];

  for (let i = 0; i < records.length; i++) {
    const { record, errors: recordErrors } = validateRecord(records[i], schema);
    if (recordErrors.length > 0) {
      errors.push(...recordErrors.map((e) => `Record ${i}: ${e}`));
      return { records: validated, errors };
    }
    validated.push(record);
  }

  return { records: validated, errors };
}

/**
 * Resolves a schema by ID and validates an array of records against it.
 * Returns validated records on success, or an error string on failure.
 */
export async function resolveAndValidateRecords(
  context: SchemaResolver,
  schemaId: unknown,
  records: Record<string, unknown>[]
): Promise<{ records: Record<string, unknown>[]; error?: string }> {
  if (!schemaId || typeof schemaId !== "string") {
    return { records };
  }
  if (!context.schemaService) {
    return { records: [], error: "Schema service not available." };
  }
  const schema = await context.schemaService.resolve(
    schemaId,
    context.organizationId
  );
  if (!schema) {
    return {
      records: [],
      error: `Schema '${schemaId}' not found or does not belong to your organization.`,
    };
  }
  const { records: validated, errors } = validateRecords(records, schema);
  if (errors.length > 0) {
    return {
      records: [],
      error: `Schema validation failed: ${errors.join("; ")}`,
    };
  }
  return { records: validated };
}

/**
 * Resolves a schema by ID and validates a single record against it.
 * Returns the validated record on success, or an error string on failure.
 */
export async function resolveAndValidateRecord(
  context: SchemaResolver,
  schemaId: unknown,
  record: Record<string, unknown>
): Promise<{ record: Record<string, unknown>; error?: string }> {
  if (!schemaId || typeof schemaId !== "string") {
    return { record };
  }
  if (!context.schemaService) {
    return { record: {}, error: "Schema service not available." };
  }
  const schema = await context.schemaService.resolve(
    schemaId,
    context.organizationId
  );
  if (!schema) {
    return {
      record: {},
      error: `Schema '${schemaId}' not found or does not belong to your organization.`,
    };
  }
  const { record: validated, errors } = validateRecord(record, schema);
  if (errors.length > 0) {
    return {
      record: {},
      error: `Schema validation failed: ${errors.join("; ")}`,
    };
  }
  return { record: validated };
}
