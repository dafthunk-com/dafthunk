import type { NodeExecution, NodeType } from "@dafthunk/types";

import { createDatabase, getDatabase } from "../../db";
import { ExecutableNode, NodeContext } from "@dafthunk/runtime";
import { DatabaseStore } from "../../stores/database-store";

export class DatabaseListTablesNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "database-list-tables",
    name: "Database List Tables",
    type: "database-list-tables",
    description: "Lists all tables in a database.",
    tags: ["Database", "Tables", "List"],
    icon: "database",
    documentation:
      "Lists all table names in a database. Returns an array of table names sorted alphabetically. Useful for discovering what tables exist in a database.",
    asTool: true,
    inputs: [
      {
        name: "databaseId",
        type: "database",
        description: "Database ID or handle.",
        required: true,
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "tables",
        type: "json",
        description: "Array of table names.",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const { databaseId: databaseIdOrHandle } = context.inputs;

    // Validate required inputs
    if (!databaseIdOrHandle) {
      return this.createErrorResult("'databaseId' is a required input.");
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

      // Query sqlite_master for all tables
      const result = await databaseStore.query(
        database.handle,
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      );

      // Extract table names from results
      const tables = result.results.map((row: any) => row.name);

      return this.createSuccessResult({
        tables,
      });
    } catch (error) {
      return this.createErrorResult(
        `Failed to list tables: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
