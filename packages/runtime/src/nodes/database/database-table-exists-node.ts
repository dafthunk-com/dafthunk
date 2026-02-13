import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

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
        name: "databaseId",
        type: "database",
        description: "Database ID or handle.",
        required: true,
        hidden: true,
      },
      {
        name: "tableName",
        type: "string",
        description: "Name of the table to check.",
        required: true,
        hidden: true,
        value: "",
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

      // Check if table exists
      const result = await connection.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        [tableName]
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
