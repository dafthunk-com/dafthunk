import { NodeExecution, NodeType } from "@dafthunk/types";

import { createDatabase, getDatabase } from "../../db";
import { ExecutableNode, NodeContext } from "../../runtime/node-types";
import { DatabaseStore } from "../../stores/database-store";

export class DatabaseQueryNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "database-query",
    name: "Database Query",
    type: "database-query",
    description:
      "Executes a SELECT query on a database and returns the results.",
    tags: ["Database", "Query", "SQL"],
    icon: "database",
    documentation:
      "Executes a SELECT query on a database and returns the results as JSON. Use this for retrieving data from your database.",
    asTool: true,
    inputs: [
      {
        name: "databaseId",
        type: "database",
        description: "Database ID or handle.",
        required: true,
        hidden: true,
      },
      {
        name: "sql",
        type: "string",
        description: "SQL SELECT query to execute.",
        required: true,
      },
      {
        name: "params",
        type: "json",
        description: "Query parameters (array of values).",
        required: false,
      },
    ],
    outputs: [
      {
        name: "results",
        type: "json",
        description: "Query results as an array of objects.",
      },
      {
        name: "rowCount",
        type: "number",
        description: "Number of rows returned.",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const { databaseId: databaseIdOrHandle, sql, params } = context.inputs;

    // Validate required inputs
    if (!databaseIdOrHandle) {
      return this.createErrorResult("'databaseId' is a required input.");
    }

    if (!sql) {
      return this.createErrorResult("'sql' is a required input.");
    }

    // Validate that it's a SELECT query
    const trimmedSql = sql.trim().toUpperCase();
    if (!trimmedSql.startsWith("SELECT")) {
      return this.createErrorResult(
        "Only SELECT queries are allowed. Use 'Database Execute' node for INSERT/UPDATE/DELETE."
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

      // Execute query via Durable Object
      const databaseStore = new DatabaseStore(context.env);
      const queryParams = Array.isArray(params) ? params : [];
      const result = await databaseStore.query(
        database.handle,
        sql,
        queryParams
      );

      return this.createSuccessResult({
        results: result.results,
        rowCount: result.results.length,
      });
    } catch (error) {
      return this.createErrorResult(
        `Failed to execute query: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
