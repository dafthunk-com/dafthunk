import type { Table, TableFieldType } from "@dafthunk/types";

/**
 * Map abstract field types to SQLite types
 */
export function mapTypeToSqlite(type: TableFieldType): string {
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
export function mapSqliteToType(sqliteType: string): TableFieldType {
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
export function generateCreateTableSQL(table: Table): string {
  const { name, fields } = table;

  if (!name || !fields || fields.length === 0) {
    throw new Error("Invalid table: table name and fields are required");
  }

  const columns = fields.map((field) => {
    const sqlType = mapTypeToSqlite(field.type);
    return `${field.name} ${sqlType}`;
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

  // Get column names from first row
  const columns = Object.keys(data[0]);
  const placeholders = columns.map(() => "?").join(", ");
  const sql = `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders})`;

  // Extract values for each row
  const params = data.map((row) => columns.map((col) => row[col]));

  return { sql, params };
}

/**
 * Check if a table exists in SQLite
 */
export function generateCheckTableExistsSQL(tableName: string): {
  sql: string;
  params: string[];
} {
  return {
    sql: "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
    params: [tableName],
  };
}
