import { ExecutableNode, NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

export class DatabaseExecuteNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "database-execute",
    name: "Database Execute",
    type: "database-execute",
    description: "Executes INSERT, UPDATE, or DELETE operations on a database.",
    tags: ["Database", "Execute", "SQL"],
    icon: "database",
    documentation:
      "Executes INSERT, UPDATE, or DELETE operations on a database. Returns metadata about the operation including rows affected and last insert ID.",
    asTool: true,
    inputs: [
      {
        name: "databaseId",
        type: "database",
        description: "Database ID or handle.",
        required: true,
        hidden: true,
      },
      {
        name: "sql",
        type: "string",
        description: "SQL command to execute (INSERT, UPDATE, DELETE, or DDL).",
        required: true,
      },
      {
        name: "params",
        type: "json",
        description: "Query parameters (array of values).",
        required: false,
      },
    ],
    outputs: [
      {
        name: "success",
        type: "boolean",
        description: "True if the operation succeeded.",
      },
      {
        name: "rowsAffected",
        type: "number",
        description: "Number of rows affected by the operation.",
      },
      {
        name: "lastInsertRowid",
        type: "number",
        description: "Last inserted row ID (for INSERT operations).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const { databaseId: databaseIdOrHandle, sql, params } = context.inputs;

    // Validate required inputs
    if (!databaseIdOrHandle) {
      return this.createErrorResult("'databaseId' is a required input.");
    }

    if (!sql) {
      return this.createErrorResult("'sql' is a required input.");
    }

    // Validate that it's NOT a SELECT query
    const trimmedSql = sql.trim().toUpperCase();
    if (trimmedSql.startsWith("SELECT")) {
      return this.createErrorResult(
        "SELECT queries are not allowed. Use 'Database Query' node for SELECT operations."
      );
    }

    try {
      if (!context.databaseService) {
        return this.createErrorResult("Database service not available.");
      }

      const connection = await context.databaseService.resolve(
        databaseIdOrHandle,
        context.organizationId
      );

      if (!connection) {
        return this.createErrorResult(
          `Database '${databaseIdOrHandle}' not found or does not belong to your organization.`
        );
      }

      const queryParams = Array.isArray(params) ? params : [];
      const result = await connection.execute(sql, queryParams);

      return this.createSuccessResult({
        success: true,
        rowsAffected: result.meta?.rowsAffected ?? 0,
        lastInsertRowid: result.meta?.lastInsertRowid ?? null,
      });
    } catch (error) {
      return this.createErrorResult(
        `Failed to execute command: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
