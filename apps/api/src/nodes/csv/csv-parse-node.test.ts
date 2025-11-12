import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { CsvParseNode } from "./csv-parse-node";

describe("CsvParseNode", () => {
  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId: "csv-parse",
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    }) as unknown as NodeContext;

  it("should parse CSV with headers", async () => {
    const node = new CsvParseNode({
      nodeId: "csv-parse",
    } as unknown as Node);
    const csv = "name,age,active\nAlice,30,true\nBob,25,false";
    const result = await node.execute(createContext({ csv }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.table).toEqual({
      name: "csv_data",
      fields: [
        { name: "name", type: "string" },
        { name: "age", type: "integer" },
        { name: "active", type: "boolean" },
      ],
      data: [
        { name: "Alice", age: 30, active: true },
        { name: "Bob", age: 25, active: false },
      ],
    });
    expect(result.outputs?.rowCount).toBe(2);
  });

  it("should parse CSV without headers", async () => {
    const node = new CsvParseNode({
      nodeId: "csv-parse",
    } as unknown as Node);
    const csv = "Alice,30\nBob,25";
    const result = await node.execute(createContext({ csv, hasHeader: false }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.table).toEqual({
      name: "csv_data",
      fields: [
        { name: "column_0", type: "string" },
        { name: "column_1", type: "integer" },
      ],
      data: [
        { column_0: "Alice", column_1: 30 },
        { column_0: "Bob", column_1: 25 },
      ],
    });
  });

  it("should handle custom delimiter", async () => {
    const node = new CsvParseNode({
      nodeId: "csv-parse",
    } as unknown as Node);
    const csv = "name;age\nAlice;30\nBob;25";
    const result = await node.execute(createContext({ csv, delimiter: ";" }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.table?.data).toEqual([
      { name: "Alice", age: 30 },
      { name: "Bob", age: 25 },
    ]);
  });

  it("should handle quoted fields with commas", async () => {
    const node = new CsvParseNode({
      nodeId: "csv-parse",
    } as unknown as Node);
    const csv =
      'name,location\n"Smith, John","New York, NY"\n"Doe, Jane",Boston';
    const result = await node.execute(createContext({ csv }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.table?.data).toEqual([
      { name: "Smith, John", location: "New York, NY" },
      { name: "Doe, Jane", location: "Boston" },
    ]);
  });

  it("should handle escaped quotes", async () => {
    const node = new CsvParseNode({
      nodeId: "csv-parse",
    } as unknown as Node);
    const csv = 'text\n"He said ""Hello"""\n"Normal text"';
    const result = await node.execute(createContext({ csv }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.table?.data).toEqual([
      { text: 'He said "Hello"' },
      { text: "Normal text" },
    ]);
  });

  it("should handle empty fields", async () => {
    const node = new CsvParseNode({
      nodeId: "csv-parse",
    } as unknown as Node);
    const csv = "name,age,city\nAlice,30,\n,25,Boston";
    const result = await node.execute(createContext({ csv }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.table?.data).toEqual([
      { name: "Alice", age: 30, city: "" },
      { name: "", age: 25, city: "Boston" },
    ]);
  });

  it("should infer number types correctly", async () => {
    const node = new CsvParseNode({
      nodeId: "csv-parse",
    } as unknown as Node);
    const csv = "int,float\n42,3.14\n100,2.5";
    const result = await node.execute(createContext({ csv }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.table?.fields).toEqual([
      { name: "int", type: "integer" },
      { name: "float", type: "number" },
    ]);
    expect(result.outputs?.table?.data).toEqual([
      { int: 42, float: 3.14 },
      { int: 100, float: 2.5 },
    ]);
  });

  it("should return error for missing csv input", async () => {
    const node = new CsvParseNode({
      nodeId: "csv-parse",
    } as unknown as Node);
    const result = await node.execute(createContext({}));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Missing required input");
  });

  it("should return error for invalid csv type", async () => {
    const node = new CsvParseNode({
      nodeId: "csv-parse",
    } as unknown as Node);
    const result = await node.execute(createContext({ csv: 123 }));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Invalid input type");
  });

  it("should return error for empty csv", async () => {
    const node = new CsvParseNode({
      nodeId: "csv-parse",
    } as unknown as Node);
    const result = await node.execute(createContext({ csv: "" }));

    expect(result.status).toBe("error");
    expect(result.error).toMatch(/CSV is empty|No valid rows found/);
  });

  it("should return error for invalid delimiter", async () => {
    const node = new CsvParseNode({
      nodeId: "csv-parse",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ csv: "a,b", delimiter: "ab" })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("single character");
  });

  it("should handle CRLF line endings", async () => {
    const node = new CsvParseNode({
      nodeId: "csv-parse",
    } as unknown as Node);
    const csv = "name,age\r\nAlice,30\r\nBob,25";
    const result = await node.execute(createContext({ csv }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.rowCount).toBe(2);
  });
});
