import type { NodeExecution, NodeType, TableField } from "@dafthunk/types";

import { createDatabase, getDatabase } from "../../db";
import { ExecutableNode, NodeContext } from "@dafthunk/runtime";
import { DatabaseStore } from "../../stores/database-store";
import { mapSqliteToType } from "../../utils/database-table";

export class DatabaseDescribeTableNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "database-describe-table",
    name: "Database Describe Table",
    type: "database-describe-table",
    description: "Returns the schema (field definitions) of a table.",
    tags: ["Database", "Schema", "Describe"],
    icon: "database",
    documentation:
      "Describes a database table by returning its field definitions. Uses database introspection (PRAGMA table_info) to get field names and types. Useful for understanding table structure without fetching data.",
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
        description: "Name of the table to describe.",
        required: true,
        hidden: true,
        value: "",
      },
    ],
    outputs: [
      {
        name: "fields",
        type: "json",
        description:
          "Array of field definitions: [{name: string, type: string}]",
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

      // Use PRAGMA table_info to get schema information
      const schemaResult = await databaseStore.query(
        database.handle,
        `PRAGMA table_info(${tableName})`
      );

      if (!schemaResult.results || schemaResult.results.length === 0) {
        return this.createErrorResult(
          `Table '${tableName}' not found in database.`
        );
      }

      // Map schema results to TableField format
      // PRAGMA table_info returns: cid, name, type, notnull, dflt_value, pk
      const fields: TableField[] = schemaResult.results.map((col: any) => ({
        name: col.name,
        type: mapSqliteToType(col.type || "TEXT"),
      }));

      return this.createSuccessResult({
        fields,
      });
    } catch (error) {
      return this.createErrorResult(
        `Failed to describe table: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
