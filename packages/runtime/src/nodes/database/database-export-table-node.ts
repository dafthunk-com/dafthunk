import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType, Schema } from "@dafthunk/types";
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
        description: "Database ID.",
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
        name: "schema",
        type: "schema",
        description: "Schema with name and field definitions.",
      },
      {
        name: "data",
        type: "json",
        description: "Array of data rows (objects).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const { databaseId, tableName } = context.inputs;

    // Validate required inputs
    if (!databaseId) {
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
        databaseId,
        context.organizationId
      );

      if (!connection) {
        return this.createErrorResult(
          `Database '${databaseId}' not found or does not belong to your organization.`
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

      // Map schema results to Field format
      // PRAGMA table_info returns: cid, name, type, notnull, dflt_value, pk
      const fields = schemaResult.results.map((col: any) => ({
        name: col.name,
        type: mapSqliteToType(col.type || "TEXT"),
        ...(col.pk ? { primaryKey: true } : {}),
      }));

      // Query all data from the table
      const dataResult = await connection.query(`SELECT * FROM ${tableName}`);
      const data = dataResult.results as Record<string, unknown>[];

      const schema: Schema = { name: tableName as string, fields };

      return this.createSuccessResult({
        schema,
        data,
      });
    } catch (error) {
      return this.createErrorResult(
        `Failed to export table: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
