import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { Field, NodeExecution, NodeType, Schema } from "@dafthunk/types";
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
        description: "Database ID.",
        required: true,
        hidden: true,
      },
      {
        name: "tableName",
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
      const fields: Field[] = schemaResult.results.map((col: any) => ({
        name: col.name,
        type: mapSqliteToType(col.type || "TEXT"),
        ...(col.pk ? { primaryKey: true } : {}),
      }));

      const schema: Schema = {
        name: tableName as string,
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
