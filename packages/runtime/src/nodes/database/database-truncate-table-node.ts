import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

export class DatabaseTruncateTableNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "database-truncate-table",
    name: "Database Truncate Table",
    type: "database-truncate-table",
    description: "Deletes all rows from a table while keeping its structure.",
    tags: ["Database", "Truncate", "Clear"],
    icon: "database",
    documentation:
      "Deletes all rows from a table while preserving the table structure. The table definition (fields, types) remains intact. This is useful for clearing data without recreating the table. Returns the number of rows deleted.",
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
        name: "tableName",
        type: "string",
        description: "Name of the table to truncate.",
        required: true,
        hidden: true,
        value: "",
      },
    ],
    outputs: [
      {
        name: "success",
        type: "boolean",
        description: "True if the operation succeeded.",
      },
      {
        name: "rowsDeleted",
        type: "number",
        description: "Number of rows deleted.",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const { databaseId: databaseIdOrHandle, tableName } = context.inputs;

    // Validate required inputs
    if (!databaseIdOrHandle) {
      return this.createErrorResult("'databaseId' is a required input.");
    }

    if (!tableName) {
      return this.createErrorResult("'tableName' is a required input.");
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

      // Check if table exists first
      const tableCheck = await connection.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        [tableName]
      );

      if (tableCheck.results.length === 0) {
        return this.createErrorResult(
          `Table '${tableName}' not found in database.`
        );
      }

      // Delete all rows from the table
      // SQLite doesn't have TRUNCATE, so we use DELETE
      const result = await connection.execute(`DELETE FROM ${tableName}`);

      const rowsDeleted = result.meta?.rowsAffected ?? 0;

      return this.createSuccessResult({
        success: true,
        rowsDeleted,
      });
    } catch (error) {
      return this.createErrorResult(
        `Failed to truncate table: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
