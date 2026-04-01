import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";
import { validateIdentifier } from "../../utils/database-table";

export class DatabaseDropTableNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "database-drop-table",
    name: "Database Drop Table",
    type: "database-drop-table",
    description: "Drops (deletes) a table from a database.",
    tags: ["Database", "Drop", "Delete"],
    icon: "database",
    documentation:
      "Drops (deletes) a table from a database. This operation is irreversible and will delete both the table structure and all its data. Use with caution.",
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
        description: "Name of the table to drop.",
        required: true,
      },
    ],
    outputs: [
      {
        name: "success",
        type: "boolean",
        description: "True if the table was dropped successfully.",
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

      // Drop the table
      await connection.execute(`DROP TABLE IF EXISTS ${table}`);

      return this.createSuccessResult({
        success: true,
      });
    } catch (error) {
      return this.createErrorResult(
        `Failed to drop table: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
