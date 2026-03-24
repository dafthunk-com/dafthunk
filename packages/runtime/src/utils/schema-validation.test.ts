import type { Schema } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { validateRecord, validateRecords } from "./schema-validation";

describe("validateRecord", () => {
  const schema: Schema = {
    name: "user",
    fields: [
      { name: "name", type: "string", required: true },
      { name: "age", type: "integer" },
      { name: "score", type: "number" },
      { name: "active", type: "boolean" },
    ],
  };

  it("should pass a valid record unchanged", () => {
    const record = { name: "Alice", age: 30, score: 95.5, active: true };
    const result = validateRecord(record, schema);

    expect(result.errors).toEqual([]);
    expect(result.record).toEqual({
      name: "Alice",
      age: 30,
      score: 95.5,
      active: true,
    });
  });

  it("should drop extra fields not in schema", () => {
    const record = {
      name: "Alice",
      age: 30,
      score: 95.5,
      active: true,
      extra: "dropped",
    };
    const result = validateRecord(record, schema);

    expect(result.errors).toEqual([]);
    expect(result.record).not.toHaveProperty("extra");
    expect(result.record).toEqual({
      name: "Alice",
      age: 30,
      score: 95.5,
      active: true,
    });
  });

  it("should fill missing optional fields with null", () => {
    const record = { name: "Alice" };
    const result = validateRecord(record, schema);

    expect(result.errors).toEqual([]);
    expect(result.record).toEqual({
      name: "Alice",
      age: null,
      score: null,
      active: null,
    });
  });

  it("should error on missing required field", () => {
    const record = { age: 30 };
    const result = validateRecord(record, schema);

    expect(result.errors).toEqual(["Missing required field 'name'"]);
  });

  it("should error on null required field", () => {
    const record = { name: null, age: 30 };
    const result = validateRecord(record, schema);

    expect(result.errors).toEqual(["Missing required field 'name'"]);
  });

  it("should coerce string to integer", () => {
    const record = { name: "Alice", age: "30" };
    const result = validateRecord(record, schema);

    expect(result.errors).toEqual([]);
    expect(result.record.age).toBe(30);
  });

  it("should coerce float to integer by truncating", () => {
    const record = { name: "Alice", age: 30.7 };
    const result = validateRecord(record, schema);

    expect(result.errors).toEqual([]);
    expect(result.record.age).toBe(30);
  });

  it("should coerce string to number", () => {
    const record = { name: "Alice", score: "95.5" };
    const result = validateRecord(record, schema);

    expect(result.errors).toEqual([]);
    expect(result.record.score).toBe(95.5);
  });

  it("should coerce number to string", () => {
    const strSchema: Schema = {
      name: "test",
      fields: [{ name: "value", type: "string" }],
    };
    const result = validateRecord({ value: 42 }, strSchema);

    expect(result.errors).toEqual([]);
    expect(result.record.value).toBe("42");
  });

  it("should coerce boolean to string", () => {
    const strSchema: Schema = {
      name: "test",
      fields: [{ name: "value", type: "string" }],
    };
    const result = validateRecord({ value: true }, strSchema);

    expect(result.errors).toEqual([]);
    expect(result.record.value).toBe("true");
  });

  it("should coerce string 'true'/'false' to boolean", () => {
    const record = { name: "Alice", active: "true" };
    const result = validateRecord(record, schema);

    expect(result.errors).toEqual([]);
    expect(result.record.active).toBe(true);
  });

  it("should coerce 0/1 to boolean", () => {
    const record = { name: "Alice", active: 1 };
    const result = validateRecord(record, schema);

    expect(result.errors).toEqual([]);
    expect(result.record.active).toBe(true);
  });

  it("should error on invalid coercion (string to integer)", () => {
    const record = { name: "Alice", age: "abc" };
    const result = validateRecord(record, schema);

    expect(result.errors).toEqual([
      "Field 'age': cannot coerce string to integer",
    ]);
  });

  it("should error on object to string coercion", () => {
    const record = { name: { nested: true } };
    const result = validateRecord(record, schema);

    expect(result.errors).toEqual([
      "Field 'name': cannot coerce object to string",
    ]);
  });

  it("should handle datetime coercion from string", () => {
    const dtSchema: Schema = {
      name: "test",
      fields: [{ name: "date", type: "datetime" }],
    };
    const result = validateRecord({ date: "2024-01-15" }, dtSchema);

    expect(result.errors).toEqual([]);
    expect(typeof result.record.date).toBe("string");
    expect(new Date(result.record.date as string).getFullYear()).toBe(2024);
  });

  it("should handle datetime coercion from timestamp number", () => {
    const dtSchema: Schema = {
      name: "test",
      fields: [{ name: "date", type: "datetime" }],
    };
    const ts = new Date("2024-01-15").getTime();
    const result = validateRecord({ date: ts }, dtSchema);

    expect(result.errors).toEqual([]);
    expect(typeof result.record.date).toBe("string");
  });

  it("should error on invalid datetime", () => {
    const dtSchema: Schema = {
      name: "test",
      fields: [{ name: "date", type: "datetime" }],
    };
    const result = validateRecord({ date: "not-a-date" }, dtSchema);

    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toContain("cannot coerce");
  });

  it("should handle json type with objects", () => {
    const jsonSchema: Schema = {
      name: "test",
      fields: [{ name: "meta", type: "json" }],
    };
    const obj = { foo: "bar" };
    const result = validateRecord({ meta: obj }, jsonSchema);

    expect(result.errors).toEqual([]);
    expect(result.record.meta).toEqual({ foo: "bar" });
  });

  it("should handle json type with arrays", () => {
    const jsonSchema: Schema = {
      name: "test",
      fields: [{ name: "items", type: "json" }],
    };
    const result = validateRecord({ items: [1, 2, 3] }, jsonSchema);

    expect(result.errors).toEqual([]);
    expect(result.record.items).toEqual([1, 2, 3]);
  });

  it("should coerce json string to parsed object", () => {
    const jsonSchema: Schema = {
      name: "test",
      fields: [{ name: "meta", type: "json" }],
    };
    const result = validateRecord({ meta: '{"foo":"bar"}' }, jsonSchema);

    expect(result.errors).toEqual([]);
    expect(result.record.meta).toEqual({ foo: "bar" });
  });

  it("should handle empty record with no required fields", () => {
    const optionalSchema: Schema = {
      name: "test",
      fields: [
        { name: "a", type: "string" },
        { name: "b", type: "integer" },
      ],
    };
    const result = validateRecord({}, optionalSchema);

    expect(result.errors).toEqual([]);
    expect(result.record).toEqual({ a: null, b: null });
  });

  it("should handle schema with no fields", () => {
    const emptySchema: Schema = {
      name: "empty",
      fields: [],
    };
    const result = validateRecord({ foo: "bar" }, emptySchema);

    expect(result.errors).toEqual([]);
    expect(result.record).toEqual({});
  });
});

describe("validateRecords", () => {
  const schema: Schema = {
    name: "user",
    fields: [
      { name: "name", type: "string", required: true },
      { name: "age", type: "integer" },
    ],
  };

  it("should validate all records", () => {
    const records = [
      { name: "Alice", age: 30 },
      { name: "Bob", age: 25 },
    ];
    const result = validateRecords(records, schema);

    expect(result.errors).toEqual([]);
    expect(result.records).toEqual([
      { name: "Alice", age: 30 },
      { name: "Bob", age: 25 },
    ]);
  });

  it("should fail on first bad record with index", () => {
    const records = [
      { name: "Alice", age: 30 },
      { age: 25 }, // missing required name
      { name: "Charlie", age: 35 },
    ];
    const result = validateRecords(records, schema);

    expect(result.errors).toEqual(["Record 1: Missing required field 'name'"]);
    expect(result.records).toEqual([{ name: "Alice", age: 30 }]);
  });

  it("should handle empty array", () => {
    const result = validateRecords([], schema);

    expect(result.errors).toEqual([]);
    expect(result.records).toEqual([]);
  });

  it("should coerce across all records", () => {
    const records = [
      { name: "Alice", age: "30" },
      { name: "Bob", age: "25" },
    ];
    const result = validateRecords(records, schema);

    expect(result.errors).toEqual([]);
    expect(result.records).toEqual([
      { name: "Alice", age: 30 },
      { name: "Bob", age: 25 },
    ]);
  });

  it("should drop extra fields from all records", () => {
    const records = [
      { name: "Alice", age: 30, extra: "a" },
      { name: "Bob", age: 25, other: "b" },
    ];
    const result = validateRecords(records, schema);

    expect(result.errors).toEqual([]);
    expect(result.records).toEqual([
      { name: "Alice", age: 30 },
      { name: "Bob", age: 25 },
    ]);
  });
});
