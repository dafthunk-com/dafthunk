import { ExecutableNode, NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType, Table } from "@dafthunk/types";

export class CsvExtractColumnNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "csv-extract-column",
    name: "CSV Extract Column",
    type: "csv-extract-column",
    description: "Extract all values from a specific column in a Table",
    tags: ["Document", "CSV", "Extract", "Data"],
    icon: "columns",
    documentation:
      "Extracts all values from a specified column in a Table, returning them as an array. Useful for analyzing or processing a single column of data.",
    asTool: true,
    inputs: [
      {
        name: "table",
        type: "json",
        description:
          "Table with fields and data: {name: string, fields: [{name: string, type: string}], data: object[]}",
        required: true,
      },
      {
        name: "column",
        type: "string",
        description: "Column name to extract",
        required: true,
      },
    ],
    outputs: [
      {
        name: "values",
        type: "json",
        description: "Array of values from the specified column",
      },
      {
        name: "count",
        type: "number",
        description: "Number of values extracted",
        hidden: true,
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { table, column } = context.inputs;

      if (table === null || table === undefined) {
        return this.createErrorResult("Missing required input: table");
      }

      if (typeof table !== "object" || Array.isArray(table)) {
        return this.createErrorResult(
          "Invalid input type for table: expected Table object"
        );
      }

      if (!column || typeof column !== "string") {
        return this.createErrorResult(
          "Missing or invalid required input: column"
        );
      }

      // Validate table structure
      const tableObj = table as Table;
      if (!tableObj.fields || !Array.isArray(tableObj.fields)) {
        return this.createErrorResult(
          "Invalid table structure: missing or invalid 'fields' array"
        );
      }

      if (!tableObj.data || !Array.isArray(tableObj.data)) {
        return this.createErrorResult(
          "Invalid table structure: missing or invalid 'data' array"
        );
      }

      // Check if column exists
      const columnExists = tableObj.fields.some(
        (field) => field.name === column
      );
      if (!columnExists) {
        return this.createErrorResult(
          `Column '${column}' not found in table. Available columns: ${tableObj.fields.map((f) => f.name).join(", ")}`
        );
      }

      // Extract column values
      const values = tableObj.data.map((row) => row[column]);

      return this.createSuccessResult({
        values,
        count: values.length,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error extracting column: ${error.message}`
      );
    }
  }
}
