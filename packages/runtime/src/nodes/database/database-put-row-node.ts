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
    description:
      "Inserts a row, or replaces it if a matching primary key exists.",
    tags: ["Database", "Put", "Row"],
    icon: "database",
    documentation:
      "Inserts a row into a table. If the schema defines a primary key and a row with the same key already exists, it replaces it (INSERT OR REPLACE). If no primary key is defined, the row is appended (INSERT INTO).",
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
          "Row object to insert or replace. Must include the primary key field if the schema defines one.",
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

    if (
      !recordInput ||
      typeof recordInput !== "object" ||
      Array.isArray(recordInput)
    ) {
      return this.createErrorResult("'record' must be an object.");
    }

    const record = recordInput as Record<string, unknown>;

    if (pkField && !(pkField.name in record)) {
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

      const sql = pkField
        ? `INSERT OR REPLACE INTO ${schema.name} (${columns.join(", ")}) VALUES (${placeholders})`
        : `INSERT INTO ${schema.name} (${columns.join(", ")}) VALUES (${placeholders})`;

      await connection.execute(sql, values);

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
