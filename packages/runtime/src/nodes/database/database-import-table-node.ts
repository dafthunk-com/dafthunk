import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType, Schema } from "@dafthunk/types";
import {
  generateCheckTableExistsSQL,
  generateCreateTableSQL,
  generateInsertSQL,
} from "../../utils/database-table";
import { validateRecords } from "../../utils/schema-validation";

export class DatabaseImportTableNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "database-import-table",
    name: "Database Import Table",
    type: "database-import-table",
    description: "Imports a table with schema and data into a database.",
    tags: ["Database", "Import", "Table"],
    icon: "database",
    documentation:
      "Imports a table into a database. If the table doesn't exist, it creates it. Supports two modes: 'append' adds data to existing table, 'replace' drops and recreates the table. Supports basic types: string, integer, number, boolean, datetime, json.",
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
        description: "Schema defining the table structure and field types.",
        required: true,
      },
      {
        name: "data",
        type: "json",
        description: "Array of data rows (objects).",
        required: true,
      },
      {
        name: "mode",
        type: "string",
        description:
          "Import mode: 'append' (default) adds data to existing table, 'replace' drops and recreates table.",
        required: false,
        hidden: true,
        value: "append",
      },
    ],
    outputs: [
      {
        name: "created",
        type: "boolean",
        description: "True if the table was created (didn't exist before).",
      },
      {
        name: "inserted",
        type: "number",
        description: "Number of rows inserted.",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const {
      database,
      schema: schemaInput,
      data: dataInput,
      mode,
    } = context.inputs;

    // Validate required inputs
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

    if (schema.fields.length === 0) {
      return this.createErrorResult(
        "Invalid schema: 'fields' array cannot be empty."
      );
    }

    if (!dataInput || !Array.isArray(dataInput)) {
      return this.createErrorResult("'data' must be an array.");
    }

    // Validate mode
    const importMode = (mode as string) || "append";
    if (importMode !== "append" && importMode !== "replace") {
      return this.createErrorResult(
        "Invalid mode: must be 'append' or 'replace'."
      );
    }

    // Validate and coerce data against the schema
    const { records: data, errors } = validateRecords(
      dataInput as Record<string, unknown>[],
      schema
    );
    if (errors.length > 0) {
      return this.createErrorResult(
        `Schema validation failed: ${errors.join("; ")}`
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

      // Check if table exists
      const checkTableSQL = generateCheckTableExistsSQL(schema.name);
      const checkResult = await connection.query(
        checkTableSQL.sql,
        checkTableSQL.params
      );

      const tableExists = checkResult.results.length > 0;
      let created = false;

      // Handle replace mode: drop existing table
      if (importMode === "replace" && tableExists) {
        await connection.execute(`DROP TABLE ${schema.name}`);
      }

      // Create table if it doesn't exist or was dropped
      if (!tableExists || importMode === "replace") {
        const createTableSQL = generateCreateTableSQL(schema);
        await connection.execute(createTableSQL);
        created = !tableExists; // Only true if table didn't exist before
      }

      // Insert data if provided
      let inserted = 0;
      if (data.length > 0) {
        const { sql, params } = generateInsertSQL(schema.name, data);

        // Insert each row
        for (const rowParams of params) {
          const result = await connection.execute(sql, rowParams);
          inserted += result.meta?.rowsAffected ?? 0;
        }
      }

      return this.createSuccessResult({
        created,
        inserted,
      });
    } catch (error) {
      return this.createErrorResult(
        `Failed to import table: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
