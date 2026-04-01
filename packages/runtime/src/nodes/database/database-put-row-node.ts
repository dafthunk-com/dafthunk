import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType, Schema } from "@dafthunk/types";
import {
  getPrimaryKeyField,
  validateIdentifier,
} from "../../utils/database-table";

export class DatabasePutRowNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "database-put-row",
    name: "Database Put Row",
    type: "database-put-row",
    description: "Inserts or replaces a row by its primary key.",
    tags: ["Database", "Put", "Row"],
    icon: "database",
    documentation:
      "Inserts a row into a table, or replaces it if a row with the same primary key already exists. The record must include the primary key field. Uses INSERT OR REPLACE for idempotent write semantics.",
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
        name: "record",
        type: "json",
        description:
          "Row object to insert or replace. Must include the primary key field.",
        required: true,
      },
    ],
    outputs: [
      {
        name: "success",
        type: "boolean",
        description: "True if the operation succeeded.",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const {
      database,
      schema: schemaInput,
      record: recordInput,
    } = context.inputs;

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

    if (
      !recordInput ||
      typeof recordInput !== "object" ||
      Array.isArray(recordInput)
    ) {
      return this.createErrorResult("'record' must be an object.");
    }

    const record = recordInput as Record<string, unknown>;

    if (!(pkField.name in record)) {
      return this.createErrorResult(
        `Record must include the primary key field '${pkField.name}'.`
      );
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

      const columns = Object.keys(record);
      for (const col of columns) {
        validateIdentifier(col, "column name");
      }
      const placeholders = columns.map(() => "?").join(", ");
      const values = columns.map((col) => record[col]);

      await connection.execute(
        `INSERT OR REPLACE INTO ${schema.name} (${columns.join(", ")}) VALUES (${placeholders})`,
        values
      );

      return this.createSuccessResult({
        success: true,
      });
    } catch (error) {
      return this.createErrorResult(
        `Failed to put row: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
