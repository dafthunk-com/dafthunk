import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { validateIdentifier } from "../../utils/database-table";

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
        name: "database",
        type: "database",
        description: "Database ID.",
        required: true,
        hidden: true,
      },
      {
        name: "table",
        type: "string",
        description: "Name of the table to count.",
        required: true,
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

      // Get row count
      const result = await connection.query(
        `SELECT COUNT(*) as count FROM ${table}`
      );

      const firstRow = result.results[0] as Record<string, unknown> | undefined;
      const count = (firstRow?.count as number) || 0;

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
