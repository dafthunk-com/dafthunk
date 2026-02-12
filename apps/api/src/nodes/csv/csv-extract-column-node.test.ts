import { NodeContext } from "@dafthunk/runtime";
import { Node, Table } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { CsvExtractColumnNode } from "./csv-extract-column-node";

describe("CsvExtractColumnNode", () => {
  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId: "csv-extract-column",
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    }) as unknown as NodeContext;

  const sampleTable: Table = {
    name: "users",
    fields: [
      { name: "name", type: "string" },
      { name: "age", type: "integer" },
      { name: "city", type: "string" },
      { name: "score", type: "number" },
    ],
    data: [
      { name: "Alice", age: 30, city: "New York", score: 95.5 },
      { name: "Bob", age: 25, city: "Boston", score: 87.3 },
      { name: "Charlie", age: 35, city: "New York", score: 92.1 },
      { name: "Diana", age: 28, city: "Chicago", score: 88.7 },
    ],
  };

  it("should extract string column", async () => {
    const node = new CsvExtractColumnNode({
      nodeId: "csv-extract-column",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ table: sampleTable, column: "name" })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.values).toEqual([
      "Alice",
      "Bob",
      "Charlie",
      "Diana",
    ]);
    expect(result.outputs?.count).toBe(4);
  });

  it("should extract integer column", async () => {
    const node = new CsvExtractColumnNode({
      nodeId: "csv-extract-column",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ table: sampleTable, column: "age" })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.values).toEqual([30, 25, 35, 28]);
    expect(result.outputs?.count).toBe(4);
  });

  it("should extract number column", async () => {
    const node = new CsvExtractColumnNode({
      nodeId: "csv-extract-column",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ table: sampleTable, column: "score" })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.values).toEqual([95.5, 87.3, 92.1, 88.7]);
    expect(result.outputs?.count).toBe(4);
  });

  it("should extract column with duplicate values", async () => {
    const node = new CsvExtractColumnNode({
      nodeId: "csv-extract-column",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ table: sampleTable, column: "city" })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.values).toEqual([
      "New York",
      "Boston",
      "New York",
      "Chicago",
    ]);
    expect(result.outputs?.count).toBe(4);
  });

  it("should handle empty table", async () => {
    const node = new CsvExtractColumnNode({
      nodeId: "csv-extract-column",
    } as unknown as Node);
    const emptyTable: Table = {
      name: "empty",
      fields: [{ name: "name", type: "string" }],
      data: [],
    };
    const result = await node.execute(
      createContext({ table: emptyTable, column: "name" })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.values).toEqual([]);
    expect(result.outputs?.count).toBe(0);
  });

  it("should handle null and undefined values", async () => {
    const node = new CsvExtractColumnNode({
      nodeId: "csv-extract-column",
    } as unknown as Node);
    const tableWithNulls: Table = {
      name: "test",
      fields: [
        { name: "name", type: "string" },
        { name: "value", type: "string" },
      ],
      data: [
        { name: "Alice", value: "A" },
        { name: "Bob", value: null },
        { name: "Charlie", value: undefined },
      ],
    };
    const result = await node.execute(
      createContext({ table: tableWithNulls, column: "value" })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.values).toEqual(["A", null, undefined]);
    expect(result.outputs?.count).toBe(3);
  });

  it("should handle boolean values", async () => {
    const node = new CsvExtractColumnNode({
      nodeId: "csv-extract-column",
    } as unknown as Node);
    const tableWithBooleans: Table = {
      name: "test",
      fields: [
        { name: "name", type: "string" },
        { name: "active", type: "boolean" },
      ],
      data: [
        { name: "Alice", active: true },
        { name: "Bob", active: false },
        { name: "Charlie", active: true },
      ],
    };
    const result = await node.execute(
      createContext({ table: tableWithBooleans, column: "active" })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.values).toEqual([true, false, true]);
    expect(result.outputs?.count).toBe(3);
  });

  it("should handle object values", async () => {
    const node = new CsvExtractColumnNode({
      nodeId: "csv-extract-column",
    } as unknown as Node);
    const tableWithObjects: Table = {
      name: "test",
      fields: [
        { name: "name", type: "string" },
        { name: "meta", type: "json" },
      ],
      data: [
        { name: "Alice", meta: { foo: "bar" } },
        { name: "Bob", meta: { baz: 123 } },
      ],
    };
    const result = await node.execute(
      createContext({ table: tableWithObjects, column: "meta" })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.values).toEqual([{ foo: "bar" }, { baz: 123 }]);
    expect(result.outputs?.count).toBe(2);
  });

  it("should return error for missing table input", async () => {
    const node = new CsvExtractColumnNode({
      nodeId: "csv-extract-column",
    } as unknown as Node);
    const result = await node.execute(createContext({ column: "name" }));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Missing required input: table");
  });

  it("should return error for invalid table type", async () => {
    const node = new CsvExtractColumnNode({
      nodeId: "csv-extract-column",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ table: "not a table", column: "name" })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Invalid input type");
  });

  it("should return error for missing column input", async () => {
    const node = new CsvExtractColumnNode({
      nodeId: "csv-extract-column",
    } as unknown as Node);
    const result = await node.execute(createContext({ table: sampleTable }));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Missing or invalid required input: column");
  });

  it("should return error for nonexistent column", async () => {
    const node = new CsvExtractColumnNode({
      nodeId: "csv-extract-column",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ table: sampleTable, column: "nonexistent" })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Column 'nonexistent' not found");
    expect(result.error).toContain("Available columns");
  });

  it("should return error for invalid table structure without fields", async () => {
    const node = new CsvExtractColumnNode({
      nodeId: "csv-extract-column",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ table: { name: "test", data: [] }, column: "name" })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("missing or invalid 'fields'");
  });

  it("should return error for invalid table structure without data", async () => {
    const node = new CsvExtractColumnNode({
      nodeId: "csv-extract-column",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        table: { name: "test", fields: [{ name: "name", type: "string" }] },
        column: "name",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("missing or invalid 'data'");
  });

  it("should handle table with single row", async () => {
    const node = new CsvExtractColumnNode({
      nodeId: "csv-extract-column",
    } as unknown as Node);
    const singleRowTable: Table = {
      name: "test",
      fields: [{ name: "name", type: "string" }],
      data: [{ name: "Alice" }],
    };
    const result = await node.execute(
      createContext({ table: singleRowTable, column: "name" })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.values).toEqual(["Alice"]);
    expect(result.outputs?.count).toBe(1);
  });
});
