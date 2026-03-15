import type { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import type { NodeContext } from "../../node-types";
import { ParquetQueryNode } from "./parquet-query-node";

describe("ParquetQueryNode", () => {
  const createContext = (
    inputs: Record<string, unknown>,
    envOverrides?: Record<string, unknown>
  ): NodeContext =>
    ({
      nodeId: "parquet-query",
      workflowId: "test-workflow",
      organizationId: "test-org",
      inputs,
      getIntegration: async () => {
        throw new Error("No integrations in test");
      },
      env: { ...envOverrides },
    }) as unknown as NodeContext;

  it("should return error for missing sql input", async () => {
    const node = new ParquetQueryNode({
      nodeId: "parquet-query",
    } as unknown as Node);
    const result = await node.execute(createContext({}));

    expect(result.status).toBe("error");
    expect(result.error).toContain("'sql' is a required string input");
  });

  it("should return error for non-string sql input", async () => {
    const node = new ParquetQueryNode({
      nodeId: "parquet-query",
    } as unknown as Node);
    const result = await node.execute(createContext({ sql: 123 }));

    expect(result.status).toBe("error");
    expect(result.error).toContain("'sql' is a required string input");
  });

  it("should reject non-SELECT queries", async () => {
    const node = new ParquetQueryNode({
      nodeId: "parquet-query",
    } as unknown as Node);
    const result = await node.execute(
      createContext({ sql: "INSERT INTO foo VALUES (1)" })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("Only SELECT or WITH (CTE) queries");
  });

  it("should allow WITH (CTE) queries", async () => {
    const node = new ParquetQueryNode({
      nodeId: "parquet-query",
    } as unknown as Node);
    // Will fail at sandbox binding check, but validates the CTE is allowed
    const result = await node.execute(
      createContext({
        sql: "WITH cte AS (SELECT 1) SELECT * FROM cte",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("DUCKDB_SANDBOX binding is not configured");
  });

  it("should return error when DUCKDB_SANDBOX binding is missing", async () => {
    const node = new ParquetQueryNode({
      nodeId: "parquet-query",
    } as unknown as Node);
    const result = await node.execute(
      createContext({
        sql: "SELECT * FROM read_parquet('https://example.com/data.parquet')",
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toContain("DUCKDB_SANDBOX binding is not configured");
  });
});
