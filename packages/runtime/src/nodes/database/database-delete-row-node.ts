import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType, Schema } from "@dafthunk/types";
import {
  getPrimaryKeyField,
  validateIdentifier,
} from "../../utils/database-table";

export class DatabaseDeleteRowNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "database-delete-row",
    name: "Database Delete Row",
    type: "database-delete-row",
    description: "Deletes a single row by its primary key.",
    tags: ["Database", "Delete", "Row"],
    icon: "database",
    documentation:
      "Deletes a single row from a table using the primary key defined in the schema. Returns whether the deletion was successful and how many rows were deleted.",
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
        name: "schema",
        type: "schema",
        description: "Schema defining the table structure with a primary key.",
        required: true,
      },
      {
        name: "key",
        type: "json",
        description: "Primary key value of the row to delete.",
        required: true,
      },
    ],
    outputs: [
      {
        name: "success",
        type: "boolean",
        description: "True if the operation succeeded.",
      },
      {
        name: "deleted",
        type: "number",
        description: "Number of rows deleted (0 or 1).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const { database, schema: schemaInput, key } = context.inputs;

    if (!database) {
      return this.createErrorResult("'database' is a required input.");
    }

    if (!schemaInput) {
      return this.createErrorResult("'schema' is a required input.");
    }

    const schema = schemaInput as Schema;
    if (!schema.name || !schema.fields || !Array.isArray(schema.fields)) {
      return this.createErrorResult(
        "Invalid schema: must include 'name' (string) and 'fields' (array)."
      );
    }

    const pkField = getPrimaryKeyField(schema);
    if (!pkField) {
      return this.createErrorResult(
        "Schema has no primary key defined. Set primaryKey on a field."
      );
    }

    if (key === undefined || key === null) {
      return this.createErrorResult("'key' is a required input.");
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

      validateIdentifier(schema.name, "table name");
      validateIdentifier(pkField.name, "column name");

      const result = await connection.execute(
        `DELETE FROM ${schema.name} WHERE ${pkField.name} = ?`,
        [key]
      );

      const deleted = result.meta?.rowsAffected ?? 0;

      return this.createSuccessResult({
        success: true,
        deleted,
      });
    } catch (error) {
      return this.createErrorResult(
        `Failed to delete row: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
