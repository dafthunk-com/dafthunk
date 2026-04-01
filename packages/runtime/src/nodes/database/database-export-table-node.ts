import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType, Schema } from "@dafthunk/types";
import {
  mapSqliteToType,
  type PragmaTableInfoRow,
  validateIdentifier,
} from "../../utils/database-table";

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
        name: "database",
        type: "database",
        description: "Database ID.",
        required: true,
        hidden: true,
      },
      {
        name: "table",
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

      // Use PRAGMA table_info to get schema information
      const schemaResult = await connection.query(
        `PRAGMA table_info(${table})`
      );

      if (!schemaResult.results || schemaResult.results.length === 0) {
        return this.createErrorResult(
          `Table '${table}' not found in database.`
        );
      }

      // Map schema results to Field format
      // PRAGMA table_info returns: cid, name, type, notnull, dflt_value, pk
      const rows = schemaResult.results as unknown as PragmaTableInfoRow[];
      const fields = rows.map((col) => ({
        name: col.name,
        type: mapSqliteToType(col.type || "TEXT"),
        ...(col.pk ? { primaryKey: true } : {}),
      }));

      // Query all data from the table
      const dataResult = await connection.query(`SELECT * FROM ${table}`);
      const data = dataResult.results as Record<string, unknown>[];

      const schema: Schema = { name: table as string, fields };

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
