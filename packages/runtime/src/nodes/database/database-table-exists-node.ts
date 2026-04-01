import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { validateIdentifier } from "../../utils/database-table";

export class DatabaseTableExistsNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "database-table-exists",
    name: "Database Table Exists",
    type: "database-table-exists",
    description: "Checks if a table exists in a database.",
    tags: ["Database", "Table", "Exists"],
    icon: "database",
    documentation:
      "Checks whether a table exists in a database. Returns true if the table exists, false otherwise. Useful for conditional logic in workflows.",
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
        description: "Name of the table to check.",
        required: true,
      },
    ],
    outputs: [
      {
        name: "exists",
        type: "boolean",
        description: "True if the table exists, false otherwise.",
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

      validateIdentifier(table as string, "table name");

      // Check if table exists
      const result = await connection.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        [table]
      );

      const exists = result.results.length > 0;

      return this.createSuccessResult({
        exists,
      });
    } catch (error) {
      return this.createErrorResult(
        `Failed to check table existence: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
