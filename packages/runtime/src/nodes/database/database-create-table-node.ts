import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType, Schema } from "@dafthunk/types";
import {
  generateCheckTableExistsSQL,
  generateCreateTableSQL,
} from "../../utils/database-table";

export class DatabaseCreateTableNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "database-create-table",
    name: "Database Create Table",
    type: "database-create-table",
    description: "Creates a table in a database from a schema definition.",
    tags: ["Database", "Create", "Table"],
    icon: "database",
    documentation:
      "Creates a new table in a database using a schema definition. The schema specifies the table name and field types. If the table already exists, the node succeeds without modification. Supports basic types: string, integer, number, boolean, datetime, json.",
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
        name: "schema",
        type: "schema",
        description: "Schema defining the table name and field types.",
        required: true,
      },
    ],
    outputs: [
      {
        name: "created",
        type: "boolean",
        description:
          "True if the table was created, false if it already existed.",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const { databaseId, schema: schemaInput } = context.inputs;

    if (!databaseId) {
      return this.createErrorResult("'databaseId' is a required input.");
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

    if (schema.fields.length === 0) {
      return this.createErrorResult(
        "Invalid schema: 'fields' array cannot be empty."
      );
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

      // Check if table already exists
      const checkTableSQL = generateCheckTableExistsSQL(schema.name);
      const checkResult = await connection.query(
        checkTableSQL.sql,
        checkTableSQL.params
      );

      if (checkResult.results.length > 0) {
        return this.createSuccessResult({ created: false });
      }

      // Create the table
      const createTableSQL = generateCreateTableSQL(schema);
      await connection.execute(createTableSQL);

      return this.createSuccessResult({ created: true });
    } catch (error) {
      return this.createErrorResult(
        `Failed to create table: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
