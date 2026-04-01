import type { Field, FieldType, Schema } from "@dafthunk/types";

/**
 * Result row from PRAGMA table_info()
 */
export interface PragmaTableInfoRow {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

const VALID_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/**
 * Validate that a string is a safe SQL identifier (table or column name).
 * Throws if the identifier contains characters that could enable SQL injection.
 */
export function validateIdentifier(name: string, label: string): void {
  if (!VALID_IDENTIFIER.test(name)) {
    throw new Error(
      `Invalid ${label}: '${name}'. Must start with a letter or underscore and contain only letters, digits, and underscores.`
    );
  }
}

/**
 * Map abstract field types to SQLite types
 */
export function mapTypeToSqlite(type: FieldType): string {
  switch (type) {
    case "string":
      return "TEXT";
    case "integer":
      return "INTEGER";
    case "number":
      return "REAL";
    case "boolean":
      return "INTEGER"; // SQLite uses INTEGER for booleans
    case "datetime":
      return "TEXT"; // SQLite stores datetime as ISO8601 strings
    case "json":
      return "TEXT"; // SQLite stores JSON as TEXT
    default:
      throw new Error(`Unsupported field type: ${type}`);
  }
}

/**
 * Map SQLite types back to abstract field types
 * SQLite has flexible typing, so we use best-effort mapping
 */
export function mapSqliteToType(sqliteType: string): FieldType {
  const normalized = sqliteType.toUpperCase().trim();

  // INTEGER types
  if (
    normalized.includes("INT") ||
    normalized.includes("BOOLEAN") ||
    normalized.includes("BOOL")
  ) {
    return "integer";
  }

  // REAL/FLOAT types
  if (
    normalized.includes("REAL") ||
    normalized.includes("FLOAT") ||
    normalized.includes("DOUBLE") ||
    normalized.includes("DECIMAL") ||
    normalized.includes("NUMERIC")
  ) {
    return "number";
  }

  // TEXT types - check for special semantic types
  if (
    normalized.includes("JSON") ||
    normalized.includes("JSONB") ||
    normalized.includes("BLOB")
  ) {
    return "json";
  }

  if (
    normalized.includes("DATE") ||
    normalized.includes("TIME") ||
    normalized.includes("TIMESTAMP")
  ) {
    return "datetime";
  }

  // Default to string for TEXT and unknown types
  return "string";
}

/**
 * Generate CREATE TABLE statement from table
 */
export function generateCreateTableSQL(schema: Schema): string {
  const { name, fields } = schema;

  if (!name || !fields || fields.length === 0) {
    throw new Error("Invalid schema: name and fields are required");
  }

  validateIdentifier(name, "table name");
  for (const field of fields) {
    validateIdentifier(field.name, "column name");
  }

  const columns = fields.map((field) => {
    const sqlType = mapTypeToSqlite(field.type);
    const pk = field.primaryKey ? " PRIMARY KEY" : "";
    return `${field.name} ${sqlType}${pk}`;
  });

  return `CREATE TABLE IF NOT EXISTS ${name} (${columns.join(", ")})`;
}

/**
 * Generate INSERT statements for data rows
 */
export function generateInsertSQL(
  tableName: string,
  data: Record<string, unknown>[]
): { sql: string; params: unknown[][] } {
  if (!data || data.length === 0) {
    throw new Error("No data to insert");
  }

  validateIdentifier(tableName, "table name");

  // Get column names from first row
  const columns = Object.keys(data[0]);
  for (const col of columns) {
    validateIdentifier(col, "column name");
  }
  const placeholders = columns.map(() => "?").join(", ");
  const sql = `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders})`;

  // Extract values for each row
  const params = data.map((row) => columns.map((col) => row[col]));

  return { sql, params };
}

/**
 * Extract the primary key field from a schema.
 */
export function getPrimaryKeyField(schema: Schema): Field | null {
  return schema.fields.find((f) => f.primaryKey === true) ?? null;
}

/**
 * Check if a table exists in SQLite
 */
export function generateCheckTableExistsSQL(tableName: string): {
  sql: string;
  params: string[];
} {
  validateIdentifier(tableName, "table name");
  return {
    sql: "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
    params: [tableName],
  };
}
