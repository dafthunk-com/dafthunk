import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { getSandbox } from "@cloudflare/sandbox";

export class ParquetQueryNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "parquet-query",
    name: "Parquet Query",
    type: "parquet-query",
    description:
      "Executes a DuckDB SQL query on remote Parquet, CSV, or JSON files.",
    tags: ["Database", "Parquet", "DuckDB", "Query"],
    icon: "table-2",
    documentation:
      "Executes a DuckDB SQL query on remote Parquet, CSV, or JSON files accessible via HTTP or S3. " +
      "Uses DuckDB's httpfs extension for streaming reads with automatic predicate and projection pushdown. " +
      "Supports read_parquet(), read_csv(), and read_json() functions. " +
      "Example: SELECT * FROM read_parquet('https://example.com/data.parquet') LIMIT 10",
    asTool: true,
    inputs: [
      {
        name: "sql",
        type: "string",
        description:
          "DuckDB SQL query. Use read_parquet(), read_csv(), or read_json() to query remote files.",
        required: true,
      },
    ],
    outputs: [
      {
        name: "results",
        type: "json",
        description: "Query results as an array of objects.",
      },
      {
        name: "rowCount",
        type: "number",
        description: "Number of rows returned.",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const { sql } = context.inputs;

    if (!sql || typeof sql !== "string") {
      return this.createErrorResult("'sql' is a required string input.");
    }

    const trimmedSql = sql.trim().toUpperCase();
    if (!trimmedSql.startsWith("SELECT") && !trimmedSql.startsWith("WITH")) {
      return this.createErrorResult(
        "Only SELECT or WITH (CTE) queries are allowed."
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sandboxBinding = (context.env as any).DUCKDB_SANDBOX;
    if (!sandboxBinding) {
      return this.createErrorResult(
        "DUCKDB_SANDBOX binding is not configured."
      );
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sandbox = getSandbox(sandboxBinding as any, context.organizationId);

      // DuckDB and httpfs are pre-installed in the container image.
      // Execute the query with JSON output and httpfs loaded.
      const duckdbCommand = `duckdb -json -c "LOAD httpfs; SET allow_asterisks_in_http_paths = true; ${sql.replace(/"/g, '\\"')}"`;
      const queryResult = await sandbox.exec(duckdbCommand, {
        timeout: 120_000,
      });

      if (!queryResult.success) {
        return this.createErrorResult(
          `DuckDB query failed: ${queryResult.stderr}`
        );
      }

      const output = queryResult.stdout.trim();
      if (!output) {
        return this.createSuccessResult({ results: [], rowCount: 0 });
      }

      const results = JSON.parse(output) as Record<string, unknown>[];

      return this.createSuccessResult({
        results,
        rowCount: results.length,
      });
    } catch (error) {
      return this.createErrorResult(
        `Failed to execute parquet query: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
