import { Node, Table } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "@dafthunk/runtime";
import { CsvStringifyNode } from "./csv-stringify-node";

describe("CsvStringifyNode", () => {
  const createContext = (inputs: Record<string, unknown>): NodeContext =>
    ({
      nodeId: "csv-stringify",
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: {},
    }) as unknown as NodeContext;

  it("should stringify table with headers", async () => {
    const node = new CsvStringifyNode({
      nodeId: "csv-stringify",
    } as unknown as Node);
    const table: Table = {
      name: "test",
      fields: [
        { name: "name", type: "string" },
        { name: "age", type: "integer" },
        { name: "active", type: "boolean" },
      ],
      data: [
        { name: "Alice", age: 30, active: true },
        { name: "Bob", age: 25, active: false },
      ],
    };
    const result = await node.execute(createContext({ table }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.csv).toBe(
      "name,age,active\nAlice,30,true\nBob,25,false"
    );
    expect(result.outputs?.rowCount).toBe(2);
  });

  it("should stringify table without headers", async () => {
    const node = new CsvStringifyNode({
      nodeId: "csv-stringify",
    } as unknown as Node);
    const table: Table = {
      name: "test",
      fields: [
        { name: "name", type: "string" },
        { name: "age", type: "integer" },
      ],
      data: [
        { name: "Alice", age: 30 },
        { name: "Bob", age: 25 },
      ],
    };
    const result = await node.execute(
      createContext({ table, includeHeader: false })
    );

    expect(result.status).toBe("completed");
    expect(result.outputs?.csv).toBe("Alice,30\nBob,25");
  });

  it("should handle custom delimiter", async () => {
    const node = new CsvStringifyNode({
      nodeId: "csv-stringify",
    } as unknown as Node);
    const table: Table = {
      name: "test",
      fields: [
        { name: "name", type: "string" },
        { name: "age", type: "integer" },
      ],
      data: [{ name: "Alice", age: 30 }],
    };
    const result = await node.execute(createContext({ table, delimiter: ";" }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.csv).toBe("name;age\nAlice;30");
  });

  it("should quote fields with commas", async () => {
    const node = new CsvStringifyNode({
      nodeId: "csv-stringify",
    } as unknown as Node);
    const table: Table = {
      name: "test",
      fields: [
        { name: "name", type: "string" },
        { name: "location", type: "string" },
      ],
      data: [
        { name: "Smith, John", location: "New York, NY" },
        { name: "Doe, Jane", location: "Boston" },
      ],
    };
    const result = await node.execute(createContext({ table }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.csv).toBe(
      'name,location\n"Smith, John","New York, NY"\n"Doe, Jane",Boston'
    );
  });

  it("should escape quotes in fields", async () => {
    const node = new CsvStringifyNode({
      nodeId: "csv-stringify",
    } as unknown as Node);
    const table: Table = {
      name: "test",
      fields: [{ name: "text", type: "string" }],
      data: [{ text: 'He said "Hello"' }, { text: "Normal text" }],
    };
    const result = await node.execute(createContext({ table }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.csv).toBe('text\n"He said ""Hello"""\nNormal text');
  });

  it("should handle empty fields", async () => {
    const node = new CsvStringifyNode({
      nodeId: "csv-stringify",
    } as unknown as Node);
    const table: Table = {
      name: "test",
      fields: [
        { name: "name", type: "string" },
        { name: "age", type: "integer" },
        { name: "city", type: "string" },
      ],
      data: [
        { name: "Alice", age: 30, city: "" },
        { name: "", age: 25, city: "Boston" },
      ],
    };
    const result = await node.execute(createContext({ table }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.csv).toBe("name,age,city\nAlice,30,\n,25,Boston");
  });

  it("should handle null and undefined values", async () => {
    const node = new CsvStringifyNode({
      nodeId: "csv-stringify",
    } as unknown as Node);
    const table: Table = {
      name: "test",
      fields: [
        { name: "name", type: "string" },
        { name: "value1", type: "string" },
        { name: "value2", type: "string" },
      ],
      data: [{ name: "Alice", value1: null, value2: undefined }],
    };
    const result = await node.execute(createContext({ table }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.csv).toBe("name,value1,value2\nAlice,,");
  });

  it("should handle boolean values", async () => {
    const node = new CsvStringifyNode({
      nodeId: "csv-stringify",
    } as unknown as Node);
    const table: Table = {
      name: "test",
      fields: [
        { name: "name", type: "string" },
        { name: "active", type: "boolean" },
      ],
      data: [
        { name: "Alice", active: true },
        { name: "Bob", active: false },
      ],
    };
    const result = await node.execute(createContext({ table }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.csv).toBe("name,active\nAlice,true\nBob,false");
  });

  it("should handle number values", async () => {
    const node = new CsvStringifyNode({
      nodeId: "csv-stringify",
    } as unknown as Node);
    const table: Table = {
      name: "test",
      fields: [
        { name: "int", type: "integer" },
        { name: "float", type: "number" },
      ],
      data: [
        { int: 42, float: 3.14 },
        { int: 100, float: 2.5 },
      ],
    };
    const result = await node.execute(createContext({ table }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.csv).toBe("int,float\n42,3.14\n100,2.5");
  });

  it("should handle object values by stringifying", async () => {
    const node = new CsvStringifyNode({
      nodeId: "csv-stringify",
    } as unknown as Node);
    const table: Table = {
      name: "test",
      fields: [
        { name: "name", type: "string" },
        { name: "meta", type: "json" },
      ],
      data: [{ name: "Alice", meta: { foo: "bar" } }],
    };
    const result = await node.execute(createContext({ table }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.csv).toBe('name,meta\nAlice,"{""foo"":""bar""}"');
  });

  it("should handle newlines in fields", async () => {
    const node = new CsvStringifyNode({
      nodeId: "csv-stringify",
    } as unknown as Node);
    const table: Table = {
      name: "test",
      fields: [{ name: "text", type: "string" }],
      data: [{ text: "Line 1\nLine 2" }],
    };
    const result = await node.execute(createContext({ table }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.csv).toBe('text\n"Line 1\nLine 2"');
  });

  it("should return error for missing table input", async () => {
    const node = new CsvStringifyNode({
      nodeId: "csv-stringify",
    } as unknown as Node);
    const result = await node.execute(createContext({}));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Missing required input");
  });

  it("should return error for invalid table type", async () => {
    const node = new CsvStringifyNode({
      nodeId: "csv-stringify",
    } as unknown as Node);
    const result = await node.execute(createContext({ table: "not a table" }));

    expect(result.status).toBe("error");
    expect(result.error).toContain("Invalid input type");
  });

  it("should return error for invalid delimiter", async () => {
    const node = new CsvStringifyNode({
      nodeId: "csv-stringify",
    } as unknown as Node);
    const table: Table = {
      name: "test",
      fields: [{ name: "name", type: "string" }],
      data: [],
    };
    const result = await node.execute(
      createContext({ table, delimiter: "ab" })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("single character");
  });

  it("should return error for table without fields", async () => {
    const node = new CsvStringifyNode({
      nodeId: "csv-stringify",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ table: { name: "test", data: [] } })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("missing or invalid 'fields'");
  });

  it("should return error for table without data", async () => {
    const node = new CsvStringifyNode({
      nodeId: "csv-stringify",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ table: { name: "test", fields: [] } })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("missing or invalid 'data'");
  });

  it("should handle empty data array", async () => {
    const node = new CsvStringifyNode({
      nodeId: "csv-stringify",
    } as unknown as Node);
    const table: Table = {
      name: "test",
      fields: [
        { name: "name", type: "string" },
        { name: "age", type: "integer" },
      ],
      data: [],
    };
    const result = await node.execute(createContext({ table }));

    expect(result.status).toBe("completed");
    expect(result.outputs?.csv).toBe("name,age");
    expect(result.outputs?.rowCount).toBe(0);
  });
});
