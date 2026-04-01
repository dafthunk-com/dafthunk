import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { validateIdentifier } from "../../utils/database-table";

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
        name: "database",
        type: "database",
        description: "Database ID.",
        required: true,
        hidden: true,
      },
      {
        name: "table",
        type: "string",
        description: "Name of the table to truncate.",
        required: true,
      },
    ],
    outputs: [
      {
        name: "success",
        type: "boolean",
        description: "True if the operation succeeded.",
      },
      {
        name: "deleted",
        type: "number",
        description: "Number of rows deleted.",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const { database, table } = context.inputs;

    // Validate required inputs
    if (!database) {
      return this.createErrorResult("'database' is a required input.");
    }

    if (!table) {
      return this.createErrorResult("'table' is a required input.");
    }

    try {
      if (!context.databaseService) {
        return this.createErrorResult("Database service not available.");
      }

      const connection = await context.databaseService.resolve(
        database,
        context.organizationId
      );

      if (!connection) {
        return this.createErrorResult(
          `Database '${database}' not found or does not belong to your organization.`
        );
      }

      // Check if table exists first
      const tableCheck = await connection.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        [table]
      );

      if (tableCheck.results.length === 0) {
        return this.createErrorResult(
          `Table '${table}' not found in database.`
        );
      }

      validateIdentifier(table as string, "table name");

      // Delete all rows from the table
      // SQLite doesn't have TRUNCATE, so we use DELETE
      const result = await connection.execute(`DELETE FROM ${table}`);

      const deleted = result.meta?.rowsAffected ?? 0;

      return this.createSuccessResult({
        success: true,
        deleted,
      });
    } catch (error) {
      return this.createErrorResult(
        `Failed to truncate table: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
