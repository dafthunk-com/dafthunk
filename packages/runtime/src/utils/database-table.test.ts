import type { Schema } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import {
  generateCheckTableExistsSQL,
  generateCreateTableSQL,
  generateInsertSQL,
  getPrimaryKeyField,
  mapSqliteToType,
  mapTypeToSqlite,
  validateIdentifier,
} from "./database-table";

describe("validateIdentifier", () => {
  it("should accept valid identifiers", () => {
    expect(() => validateIdentifier("users", "table name")).not.toThrow();
    expect(() => validateIdentifier("_private", "table name")).not.toThrow();
    expect(() => validateIdentifier("my_table_2", "table name")).not.toThrow();
  });

  it("should reject identifiers starting with a digit", () => {
    expect(() => validateIdentifier("2table", "table name")).toThrow(
      "Invalid table name"
    );
  });

  it("should reject identifiers with spaces", () => {
    expect(() => validateIdentifier("my table", "table name")).toThrow(
      "Invalid table name"
    );
  });

  it("should reject identifiers with special characters", () => {
    expect(() => validateIdentifier("table; DROP", "table name")).toThrow(
      "Invalid table name"
    );
    expect(() => validateIdentifier("table'name", "column name")).toThrow(
      "Invalid column name"
    );
  });

  it("should reject empty string", () => {
    expect(() => validateIdentifier("", "table name")).toThrow(
      "Invalid table name"
    );
  });

  it("should include the label in error message", () => {
    expect(() => validateIdentifier("bad name", "column name")).toThrow(
      "Invalid column name"
    );
  });
});

describe("mapTypeToSqlite", () => {
  it("should map string to TEXT", () => {
    expect(mapTypeToSqlite("string")).toBe("TEXT");
  });

  it("should map integer to INTEGER", () => {
    expect(mapTypeToSqlite("integer")).toBe("INTEGER");
  });

  it("should map number to REAL", () => {
    expect(mapTypeToSqlite("number")).toBe("REAL");
  });

  it("should map boolean to INTEGER", () => {
    expect(mapTypeToSqlite("boolean")).toBe("INTEGER");
  });

  it("should map datetime to TEXT", () => {
    expect(mapTypeToSqlite("datetime")).toBe("TEXT");
  });

  it("should map json to TEXT", () => {
    expect(mapTypeToSqlite("json")).toBe("TEXT");
  });
});

describe("mapSqliteToType", () => {
  it("should map INTEGER to integer", () => {
    expect(mapSqliteToType("INTEGER")).toBe("integer");
  });

  it("should map INT to integer", () => {
    expect(mapSqliteToType("INT")).toBe("integer");
  });

  it("should map BOOLEAN to integer", () => {
    expect(mapSqliteToType("BOOLEAN")).toBe("integer");
  });

  it("should map REAL to number", () => {
    expect(mapSqliteToType("REAL")).toBe("number");
  });

  it("should map FLOAT to number", () => {
    expect(mapSqliteToType("FLOAT")).toBe("number");
  });

  it("should map DOUBLE to number", () => {
    expect(mapSqliteToType("DOUBLE")).toBe("number");
  });

  it("should map JSON to json", () => {
    expect(mapSqliteToType("JSON")).toBe("json");
  });

  it("should map BLOB to json", () => {
    expect(mapSqliteToType("BLOB")).toBe("json");
  });

  it("should map DATETIME to datetime", () => {
    expect(mapSqliteToType("DATETIME")).toBe("datetime");
  });

  it("should map TIMESTAMP to datetime", () => {
    expect(mapSqliteToType("TIMESTAMP")).toBe("datetime");
  });

  it("should map TEXT to string", () => {
    expect(mapSqliteToType("TEXT")).toBe("string");
  });

  it("should map unknown types to string", () => {
    expect(mapSqliteToType("VARCHAR")).toBe("string");
  });

  it("should be case-insensitive", () => {
    expect(mapSqliteToType("integer")).toBe("integer");
    expect(mapSqliteToType("  REAL  ")).toBe("number");
  });
});

describe("generateCreateTableSQL", () => {
  it("should generate valid CREATE TABLE statement", () => {
    const schema: Schema = {
      name: "users",
      fields: [
        { name: "id", type: "integer", primaryKey: true },
        { name: "name", type: "string" },
        { name: "score", type: "number" },
      ],
    };

    expect(generateCreateTableSQL(schema)).toBe(
      "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT, score REAL)"
    );
  });

  it("should throw for missing name", () => {
    const schema = {
      name: "",
      fields: [{ name: "id", type: "integer" as const }],
    };
    expect(() => generateCreateTableSQL(schema)).toThrow();
  });

  it("should throw for empty fields", () => {
    const schema: Schema = { name: "test", fields: [] };
    expect(() => generateCreateTableSQL(schema)).toThrow();
  });

  it("should throw for invalid table name", () => {
    const schema: Schema = {
      name: "bad table",
      fields: [{ name: "id", type: "integer" }],
    };
    expect(() => generateCreateTableSQL(schema)).toThrow("Invalid table name");
  });

  it("should throw for invalid column name", () => {
    const schema: Schema = {
      name: "users",
      fields: [{ name: "bad column", type: "integer" }],
    };
    expect(() => generateCreateTableSQL(schema)).toThrow("Invalid column name");
  });
});

describe("generateInsertSQL", () => {
  it("should generate INSERT statement with params", () => {
    const data = [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
    ];

    const result = generateInsertSQL("users", data);
    expect(result.sql).toBe("INSERT INTO users (id, name) VALUES (?, ?)");
    expect(result.params).toEqual([
      [1, "Alice"],
      [2, "Bob"],
    ]);
  });

  it("should throw for empty data", () => {
    expect(() => generateInsertSQL("users", [])).toThrow("No data to insert");
  });

  it("should throw for invalid table name", () => {
    expect(() => generateInsertSQL("bad table", [{ id: 1 }])).toThrow(
      "Invalid table name"
    );
  });

  it("should throw for invalid column name", () => {
    expect(() => generateInsertSQL("users", [{ "bad col": 1 }])).toThrow(
      "Invalid column name"
    );
  });
});

describe("generateCheckTableExistsSQL", () => {
  it("should generate check table SQL", () => {
    const result = generateCheckTableExistsSQL("users");
    expect(result.sql).toBe(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
    );
    expect(result.params).toEqual(["users"]);
  });

  it("should throw for invalid table name", () => {
    expect(() => generateCheckTableExistsSQL("bad table")).toThrow(
      "Invalid table name"
    );
  });
});

describe("getPrimaryKeyField", () => {
  it("should return the primary key field", () => {
    const schema: Schema = {
      name: "users",
      fields: [
        { name: "id", type: "integer", primaryKey: true },
        { name: "name", type: "string" },
      ],
    };

    const pk = getPrimaryKeyField(schema);
    expect(pk).toEqual({ name: "id", type: "integer", primaryKey: true });
  });

  it("should return null when no primary key is defined", () => {
    const schema: Schema = {
      name: "logs",
      fields: [
        { name: "message", type: "string" },
        { name: "level", type: "string" },
      ],
    };

    expect(getPrimaryKeyField(schema)).toBeNull();
  });

  it("should return null for empty fields", () => {
    const schema: Schema = {
      name: "empty",
      fields: [],
    };

    expect(getPrimaryKeyField(schema)).toBeNull();
  });

  it("should return the first primary key when multiple exist", () => {
    const schema: Schema = {
      name: "test",
      fields: [
        { name: "a", type: "string", primaryKey: true },
        { name: "b", type: "string", primaryKey: true },
      ],
    };

    const pk = getPrimaryKeyField(schema);
    expect(pk?.name).toBe("a");
  });

  it("should ignore fields with primaryKey set to false", () => {
    const schema: Schema = {
      name: "test",
      fields: [
        { name: "a", type: "string", primaryKey: false },
        { name: "b", type: "integer", primaryKey: true },
      ],
    };

    const pk = getPrimaryKeyField(schema);
    expect(pk?.name).toBe("b");
  });
});
