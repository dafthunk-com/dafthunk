import { Node, Table } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "@dafthunk/runtime";
import { CsvFilterRowsNode } from "./csv-filter-rows-node";

describe("CsvFilterRowsNode", () => {
  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId: "csv-filter-rows",
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

  it("should filter rows with equals operator", async () => {
    const node = new CsvFilterRowsNode({
      nodeId: "csv-filter-rows",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        table: sampleTable,
        column: "city",
        operator: "equals",
        value: "New York",
      })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.table?.data).toEqual([
      { name: "Alice", age: 30, city: "New York", score: 95.5 },
      { name: "Charlie", age: 35, city: "New York", score: 92.1 },
    ]);
    expect(result.outputs?.matchCount).toBe(2);
  });

  it("should filter rows with notEquals operator", async () => {
    const node = new CsvFilterRowsNode({
      nodeId: "csv-filter-rows",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        table: sampleTable,
        column: "city",
        operator: "notEquals",
        value: "New York",
      })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.matchCount).toBe(2);
    expect(result.outputs?.table?.data?.length).toBe(2);
  });

  it("should filter rows with contains operator", async () => {
    const node = new CsvFilterRowsNode({
      nodeId: "csv-filter-rows",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        table: sampleTable,
        column: "name",
        operator: "contains",
        value: "li",
      })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.table?.data).toEqual([
      { name: "Alice", age: 30, city: "New York", score: 95.5 },
      { name: "Charlie", age: 35, city: "New York", score: 92.1 },
    ]);
    expect(result.outputs?.matchCount).toBe(2);
  });

  it("should filter rows with notContains operator", async () => {
    const node = new CsvFilterRowsNode({
      nodeId: "csv-filter-rows",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        table: sampleTable,
        column: "name",
        operator: "notContains",
        value: "li",
      })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.matchCount).toBe(2);
  });

  it("should filter rows with startsWith operator", async () => {
    const node = new CsvFilterRowsNode({
      nodeId: "csv-filter-rows",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        table: sampleTable,
        column: "name",
        operator: "startsWith",
        value: "A",
      })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.table?.data).toEqual([
      { name: "Alice", age: 30, city: "New York", score: 95.5 },
    ]);
    expect(result.outputs?.matchCount).toBe(1);
  });

  it("should filter rows with endsWith operator", async () => {
    const node = new CsvFilterRowsNode({
      nodeId: "csv-filter-rows",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        table: sampleTable,
        column: "name",
        operator: "endsWith",
        value: "e",
      })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.table?.data).toEqual([
      { name: "Alice", age: 30, city: "New York", score: 95.5 },
      { name: "Charlie", age: 35, city: "New York", score: 92.1 },
    ]);
    expect(result.outputs?.matchCount).toBe(2);
  });

  it("should filter rows with greaterThan operator", async () => {
    const node = new CsvFilterRowsNode({
      nodeId: "csv-filter-rows",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        table: sampleTable,
        column: "age",
        operator: "greaterThan",
        value: "28",
      })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.table?.data).toEqual([
      { name: "Alice", age: 30, city: "New York", score: 95.5 },
      { name: "Charlie", age: 35, city: "New York", score: 92.1 },
    ]);
    expect(result.outputs?.matchCount).toBe(2);
  });

  it("should filter rows with lessThan operator", async () => {
    const node = new CsvFilterRowsNode({
      nodeId: "csv-filter-rows",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        table: sampleTable,
        column: "age",
        operator: "lessThan",
        value: "30",
      })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.table?.data).toEqual([
      { name: "Bob", age: 25, city: "Boston", score: 87.3 },
      { name: "Diana", age: 28, city: "Chicago", score: 88.7 },
    ]);
    expect(result.outputs?.matchCount).toBe(2);
  });

  it("should filter rows with greaterThanOrEqual operator", async () => {
    const node = new CsvFilterRowsNode({
      nodeId: "csv-filter-rows",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        table: sampleTable,
        column: "age",
        operator: "greaterThanOrEqual",
        value: "30",
      })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.matchCount).toBe(2);
  });

  it("should filter rows with lessThanOrEqual operator", async () => {
    const node = new CsvFilterRowsNode({
      nodeId: "csv-filter-rows",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        table: sampleTable,
        column: "age",
        operator: "lessThanOrEqual",
        value: "28",
      })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.matchCount).toBe(2);
  });

  it("should handle decimal numbers with comparison operators", async () => {
    const node = new CsvFilterRowsNode({
      nodeId: "csv-filter-rows",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        table: sampleTable,
        column: "score",
        operator: "greaterThan",
        value: "90",
      })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.matchCount).toBe(2);
  });

  it("should return empty table when no rows match", async () => {
    const node = new CsvFilterRowsNode({
      nodeId: "csv-filter-rows",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        table: sampleTable,
        column: "name",
        operator: "equals",
        value: "Nonexistent",
      })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.table?.data).toEqual([]);
    expect(result.outputs?.matchCount).toBe(0);
  });

  it("should preserve table structure in filtered result", async () => {
    const node = new CsvFilterRowsNode({
      nodeId: "csv-filter-rows",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        table: sampleTable,
        column: "city",
        operator: "equals",
        value: "Boston",
      })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.table?.name).toBe("users");
    expect(result.outputs?.table?.fields).toEqual(sampleTable.fields);
  });

  it("should return error for missing table input", async () => {
    const node = new CsvFilterRowsNode({
      nodeId: "csv-filter-rows",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ column: "name", operator: "equals", value: "Alice" })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Missing required input: table");
  });

  it("should return error for missing column input", async () => {
    const node = new CsvFilterRowsNode({
      nodeId: "csv-filter-rows",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ table: sampleTable, operator: "equals", value: "Alice" })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Missing or invalid required input: column");
  });

  it("should return error for missing operator input", async () => {
    const node = new CsvFilterRowsNode({
      nodeId: "csv-filter-rows",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ table: sampleTable, column: "name", value: "Alice" })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain(
      "Missing or invalid required input: operator"
    );
  });

  it("should return error for missing value input", async () => {
    const node = new CsvFilterRowsNode({
      nodeId: "csv-filter-rows",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        table: sampleTable,
        column: "name",
        operator: "equals",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Missing required input: value");
  });

  it("should return error for invalid operator", async () => {
    const node = new CsvFilterRowsNode({
      nodeId: "csv-filter-rows",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        table: sampleTable,
        column: "name",
        operator: "invalidOperator",
        value: "Alice",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Invalid operator");
  });

  it("should return error for nonexistent column", async () => {
    const node = new CsvFilterRowsNode({
      nodeId: "csv-filter-rows",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        table: sampleTable,
        column: "nonexistent",
        operator: "equals",
        value: "Alice",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Column 'nonexistent' not found");
  });

  it("should return error for invalid table structure", async () => {
    const node = new CsvFilterRowsNode({
      nodeId: "csv-filter-rows",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        table: { name: "test" },
        column: "name",
        operator: "equals",
        value: "Alice",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Invalid table structure");
  });

  it("should handle null and undefined cell values", async () => {
    const node = new CsvFilterRowsNode({
      nodeId: "csv-filter-rows",
    } as unknown as Node);
    const tableWithNulls: Table = {
      name: "test",
      fields: [{ name: "value", type: "string" }],
      data: [{ value: null }, { value: undefined }, { value: "" }],
    };
    const result = await node.execute(
      createContext({
        table: tableWithNulls,
        column: "value",
        operator: "equals",
        value: "",
      })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.matchCount).toBe(3);
  });
});
