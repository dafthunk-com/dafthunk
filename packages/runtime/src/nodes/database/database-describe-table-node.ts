import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { Field, NodeExecution, NodeType, Schema } from "@dafthunk/types";
import {
  mapSqliteToType,
  type PragmaTableInfoRow,
  validateIdentifier,
} from "../../utils/database-table";

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
        name: "database",
        type: "database",
        description: "Database ID.",
        required: true,
        hidden: true,
      },
      {
        name: "table",
        type: "string",
        description: "Name of the table to describe.",
        required: true,
      },
    ],
    outputs: [
      {
        name: "schema",
        type: "schema",
        description: "Schema with name and field definitions.",
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
      const fields: Field[] = rows.map((col) => ({
        name: col.name,
        type: mapSqliteToType(col.type || "TEXT"),
        ...(col.pk ? { primaryKey: true } : {}),
      }));

      const schema: Schema = {
        name: table as string,
        fields,
      };

      return this.createSuccessResult({
        schema,
      });
    } catch (error) {
      return this.createErrorResult(
        `Failed to describe table: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
