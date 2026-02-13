import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType, Table } from "@dafthunk/types";
import { mapSqliteToType } from "../../utils/database-table";

export class DatabaseExportTableNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "database-export-table",
    name: "Database Export Table",
    type: "database-export-table",
    description: "Exports a complete table with schema and data as Table.",
    tags: ["Database", "Export", "Table"],
    icon: "database",
    documentation:
      "Exports a complete database table including its schema and all data in Table format. Uses database introspection to determine field types. Perfect for backing up or copying tables.",
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
        description: "Name of the table to export.",
        required: true,
      },
    ],
    outputs: [
      {
        name: "table",
        type: "json",
        description:
          "Table with fields and data: {name: string, fields: [{name: string, type: string}], data: object[]}",
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

      // Use PRAGMA table_info to get schema information
      const schemaResult = await connection.query(
        `PRAGMA table_info(${tableName})`
      );

      if (!schemaResult.results || schemaResult.results.length === 0) {
        return this.createErrorResult(
          `Table '${tableName}' not found in database.`
        );
      }

      // Map schema results to TableField format
      // PRAGMA table_info returns: cid, name, type, notnull, dflt_value, pk
      const fields = schemaResult.results.map((col: any) => ({
        name: col.name,
        type: mapSqliteToType(col.type || "TEXT"),
      }));

      // Query all data from the table
      const dataResult = await connection.query(`SELECT * FROM ${tableName}`);

      // Build Table response
      const table: Table = {
        name: tableName,
        fields,
        data: dataResult.results as Record<string, unknown>[],
      };

      return this.createSuccessResult({
        table,
      });
    } catch (error) {
      return this.createErrorResult(
        `Failed to export table: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
