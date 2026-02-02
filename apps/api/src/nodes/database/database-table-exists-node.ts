import type { NodeExecution, NodeType } from "@dafthunk/types";

import { createDatabase, getDatabase } from "../../db";
import { ExecutableNode, NodeContext } from "../../runtime/node-types";
import { DatabaseStore } from "../../stores/database-store";

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
        type: "string",
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

      // Check if table exists
      const result = await databaseStore.query(
        database.handle,
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
