import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType, Schema } from "@dafthunk/types";
import {
  getPrimaryKeyField,
  validateIdentifier,
} from "../../utils/database-table";

export class DatabaseRowExistsNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "database-row-exists",
    name: "Database Row Exists",
    type: "database-row-exists",
    description: "Checks if a row with the given primary key exists.",
    tags: ["Database", "Row", "Exists"],
    icon: "database",
    documentation:
      "Checks whether a row with the given primary key exists in a table. Returns a boolean without fetching the full row.",
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
        description: "Primary key value to check.",
        required: true,
      },
    ],
    outputs: [
      {
        name: "exists",
        type: "boolean",
        description: "True if a row with the given primary key exists.",
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

      const result = await connection.query(
        `SELECT 1 FROM ${schema.name} WHERE ${pkField.name} = ? LIMIT 1`,
        [key]
      );

      return this.createSuccessResult({
        exists: result.results.length > 0,
      });
    } catch (error) {
      return this.createErrorResult(
        `Failed to check row existence: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
