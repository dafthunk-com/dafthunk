import type { NodeExecution, NodeType } from "@dafthunk/types";

import { createDatabase, getDatabase } from "../../db";
import { ExecutableNode, NodeContext } from "../../runtime/node-types";
import { DatabaseStore } from "../../stores/database-store";

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
        name: "databaseId",
        type: "database",
        description: "Database ID or handle.",
        required: true,
        hidden: true,
      },
      {
        name: "tableName",
        type: "string",
        description: "Name of the table to drop.",
        required: true,
        hidden: true,
        value: "",
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
    const { databaseId: databaseIdOrHandle, tableName } = context.inputs;

    // Validate required inputs
    if (!databaseIdOrHandle) {
      return this.createErrorResult("'databaseId' is a required input.");
    }

    if (!tableName) {
      return this.createErrorResult("'tableName' is a required input.");
    }

    try {
      // Get database from D1 to verify it exists and belongs to the organization
      const db = createDatabase(context.env.DB);
      const database = await getDatabase(
        db,
        databaseIdOrHandle,
        context.organizationId
      );

      if (!database) {
        return this.createErrorResult(
          `Database '${databaseIdOrHandle}' not found or does not belong to your organization.`
        );
      }

      const databaseStore = new DatabaseStore(context.env);

      // Drop the table
      await databaseStore.execute(
        database.handle,
        `DROP TABLE IF EXISTS ${tableName}`
      );

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
