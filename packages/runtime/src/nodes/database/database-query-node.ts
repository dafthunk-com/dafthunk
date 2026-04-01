import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType, Schema } from "@dafthunk/types";
import { validateRecords } from "../../utils/schema-validation";

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
        name: "database",
        type: "database",
        description: "Database ID.",
        required: true,
        hidden: true,
      },
      {
        name: "schema",
        type: "schema",
        description: "Optional schema to validate and coerce query results.",
        required: false,
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
        name: "count",
        type: "number",
        description: "Number of rows returned.",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const { database, sql, params, schema } = context.inputs;

    // Validate required inputs
    if (!database) {
      return this.createErrorResult("'database' is a required input.");
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

      const queryParams = Array.isArray(params) ? params : [];
      const result = await connection.query(sql, queryParams);

      let results = result.results as Record<string, unknown>[];
      if (schema) {
        const { records: validated, errors } = validateRecords(
          results,
          schema as Schema
        );
        if (errors.length > 0) {
          return this.createErrorResult(
            `Schema validation failed: ${errors.join("; ")}`
          );
        }
        results = validated;
      }

      return this.createSuccessResult({
        results,
        count: results.length,
      });
    } catch (error) {
      return this.createErrorResult(
        `Failed to execute query: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
