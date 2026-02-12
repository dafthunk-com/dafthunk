import { ExecutableNode, NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

export class DatabaseGetRowCountNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "database-get-row-count",
    name: "Database Get Row Count",
    type: "database-get-row-count",
    description: "Gets the number of rows in a table.",
    tags: ["Database", "Count", "Rows"],
    icon: "database",
    documentation:
      "Returns the total number of rows in a table. Executes a COUNT(*) query to efficiently count rows without loading data. Useful for checking table size before operations.",
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
        description: "Name of the table to count.",
        required: true,
        hidden: true,
        value: "",
      },
    ],
    outputs: [
      {
        name: "count",
        type: "number",
        description: "Number of rows in the table.",
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

      // Get row count
      const result = await connection.query(
        `SELECT COUNT(*) as count FROM ${tableName}`
      );

      const count = (result.results[0] as any)?.count || 0;

      return this.createSuccessResult({
        count,
      });
    } catch (error) {
      return this.createErrorResult(
        `Failed to get row count: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
