import type { NodeExecution, NodeType, Table } from "@dafthunk/types";

import { createDatabase, getDatabase } from "../../db";
import { ExecutableNode, NodeContext } from "../../runtime/node-types";
import { DatabaseStore } from "../../stores/database-store";
import {
  generateCheckTableExistsSQL,
  generateCreateTableSQL,
  generateInsertSQL,
} from "../../utils/database-table";

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
        type: "string",
        description: "Database ID or handle.",
        required: true,
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
    const {
      databaseId: databaseIdOrHandle,
      table: tableInput,
      mode,
    } = context.inputs;

    // Validate required inputs
    if (!databaseIdOrHandle) {
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
    const table = tableInput as Table;
    if (!table.name || !table.fields || !Array.isArray(table.fields)) {
      return this.createErrorResult(
        "Invalid table: must include 'name' (string) and 'fields' (array)."
      );
    }

    if (!table.data || !Array.isArray(table.data)) {
      return this.createErrorResult("Invalid table: 'data' must be an array.");
    }

    if (table.fields.length === 0) {
      return this.createErrorResult(
        "Invalid table: 'fields' array cannot be empty."
      );
    }

    try {
      // Get database from D1 to verify it exists and belongs to the organization
      const db = createDatabase(context.env.DB);
      const database = await getDatabase(
        db,
        databaseIdOrHandle,
        context.organizationId
      );

      if (!database) {
        return this.createErrorResult(
          `Database '${databaseIdOrHandle}' not found or does not belong to your organization.`
        );
      }

      const databaseStore = new DatabaseStore(context.env);

      // Check if table exists
      const checkTableSQL = generateCheckTableExistsSQL(table.name);
      const checkResult = await databaseStore.query(
        database.handle,
        checkTableSQL.sql,
        checkTableSQL.params
      );

      const tableExists = checkResult.results.length > 0;
      let tableCreated = false;

      // Handle replace mode: drop existing table
      if (importMode === "replace" && tableExists) {
        await databaseStore.execute(
          database.handle,
          `DROP TABLE ${table.name}`
        );
      }

      // Create table if it doesn't exist or was dropped
      if (!tableExists || importMode === "replace") {
        const createTableSQL = generateCreateTableSQL(table);
        await databaseStore.execute(database.handle, createTableSQL);
        tableCreated = !tableExists; // Only true if table didn't exist before
      }

      // Insert data if provided
      let rowsInserted = 0;
      if (table.data.length > 0) {
        const { sql, params } = generateInsertSQL(table.name, table.data);

        // Insert each row
        for (const rowParams of params) {
          const result = await databaseStore.execute(
            database.handle,
            sql,
            rowParams
          );
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
