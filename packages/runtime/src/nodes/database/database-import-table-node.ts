import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType, Table } from "@dafthunk/types";
import {
  generateCheckTableExistsSQL,
  generateCreateTableSQL,
  generateInsertSQL,
} from "../../utils/database-table";
import { resolveAndValidateRecords } from "../../utils/schema-validation";

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
        name: "databaseId",
        type: "database",
        description: "Database ID.",
        required: true,
        hidden: true,
      },
      {
        name: "schemaId",
        type: "schema",
        description:
          "Optional schema to validate and coerce data before import.",
        required: false,
        hidden: true,
      },
      {
        name: "table",
        type: "json",
        description:
          "Table with fields and data: {name: string, fields: [{name: string, type: string}], data: object[]}",
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
        name: "tableCreated",
        type: "boolean",
        description: "True if the table was created (didn't exist before).",
      },
      {
        name: "rowsInserted",
        type: "number",
        description: "Number of rows inserted.",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const { databaseId, table: tableInput, mode, schemaId } = context.inputs;

    // Validate required inputs
    if (!databaseId) {
      return this.createErrorResult("'databaseId' is a required input.");
    }

    if (!tableInput) {
      return this.createErrorResult("'table' is a required input.");
    }

    // Validate mode
    const importMode = (mode as string) || "append";
    if (importMode !== "append" && importMode !== "replace") {
      return this.createErrorResult(
        "Invalid mode: must be 'append' or 'replace'."
      );
    }

    // Validate table structure
    let table = tableInput as Table;
    if (
      !table.schema?.name ||
      !table.schema?.fields ||
      !Array.isArray(table.schema.fields)
    ) {
      return this.createErrorResult(
        "Invalid table: must include 'schema.name' (string) and 'schema.fields' (array)."
      );
    }

    if (!table.data || !Array.isArray(table.data)) {
      return this.createErrorResult("Invalid table: 'data' must be an array.");
    }

    if (table.schema.fields.length === 0) {
      return this.createErrorResult(
        "Invalid table: 'schema.fields' array cannot be empty."
      );
    }

    const { records: validatedData, error: schemaError } =
      await resolveAndValidateRecords(context, schemaId, table.data);
    if (schemaError) {
      return this.createErrorResult(schemaError);
    }
    table = { ...table, data: validatedData };

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

      // Check if table exists
      const checkTableSQL = generateCheckTableExistsSQL(table.schema.name);
      const checkResult = await connection.query(
        checkTableSQL.sql,
        checkTableSQL.params
      );

      const tableExists = checkResult.results.length > 0;
      let tableCreated = false;

      // Handle replace mode: drop existing table
      if (importMode === "replace" && tableExists) {
        await connection.execute(`DROP TABLE ${table.schema.name}`);
      }

      // Create table if it doesn't exist or was dropped
      if (!tableExists || importMode === "replace") {
        const createTableSQL = generateCreateTableSQL(table);
        await connection.execute(createTableSQL);
        tableCreated = !tableExists; // Only true if table didn't exist before
      }

      // Insert data if provided
      let rowsInserted = 0;
      if (table.data.length > 0) {
        const { sql, params } = generateInsertSQL(
          table.schema.name,
          table.data
        );

        // Insert each row
        for (const rowParams of params) {
          const result = await connection.execute(sql, rowParams);
          rowsInserted += result.meta?.rowsAffected ?? 0;
        }
      }

      return this.createSuccessResult({
        tableCreated,
        rowsInserted,
      });
    } catch (error) {
      return this.createErrorResult(
        `Failed to import table: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
