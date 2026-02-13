import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType, Table } from "@dafthunk/types";

export class CsvStringifyNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "csv-stringify",
    name: "CSV Stringify",
    type: "csv-stringify",
    description: "Convert a Table with schema and data into a CSV string",
    tags: ["Document", "CSV", "Stringify", "Data"],
    icon: "file-text",
    documentation:
      "Converts a structured Table format into a CSV string. Handles proper escaping of special characters and quotes.",
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
        name: "delimiter",
        type: "string",
        description: "Field delimiter character",
        value: ",",
        hidden: true,
      },
      {
        name: "includeHeader",
        type: "boolean",
        description: "Include header row with field names",
        value: true,
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "csv",
        type: "string",
        description: "The generated CSV string",
      },
      {
        name: "rowCount",
        type: "number",
        description: "Number of data rows in the output",
        hidden: true,
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { table, delimiter = ",", includeHeader = true } = context.inputs;

      if (table === null || table === undefined) {
        return this.createErrorResult("Missing required input: table");
      }

      if (typeof table !== "object" || Array.isArray(table)) {
        return this.createErrorResult(
          "Invalid input type for table: expected Table object"
        );
      }

      if (typeof delimiter !== "string" || delimiter.length !== 1) {
        return this.createErrorResult(
          "Delimiter must be a single character string"
        );
      }

      if (typeof includeHeader !== "boolean") {
        return this.createErrorResult(
          `Invalid input type for includeHeader: expected boolean, got ${typeof includeHeader}`
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

      const lines: string[] = [];

      // Add header row
      if (includeHeader) {
        const headerFields = tableObj.fields.map((field) => field.name);
        lines.push(this.formatCsvLine(headerFields, delimiter));
      }

      // Add data rows
      for (const row of tableObj.data) {
        const values = tableObj.fields.map((field) => {
          const value = row[field.name];
          return this.formatValue(value);
        });
        lines.push(this.formatCsvLine(values, delimiter));
      }

      const csv = lines.join("\n");

      return this.createSuccessResult({
        csv,
        rowCount: tableObj.data.length,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(`Error stringifying CSV: ${error.message}`);
    }
  }

  private formatValue(value: unknown): string {
    if (value === null || value === undefined) {
      return "";
    }

    if (typeof value === "boolean") {
      return value.toString();
    }

    if (typeof value === "number") {
      return value.toString();
    }

    if (typeof value === "object") {
      return JSON.stringify(value);
    }

    return String(value);
  }

  private formatCsvLine(values: string[], delimiter: string): string {
    return values
      .map((value) => {
        // Check if value needs quoting
        const needsQuotes =
          value.includes(delimiter) ||
          value.includes('"') ||
          value.includes("\n") ||
          value.includes("\r");

        if (needsQuotes) {
          // Escape quotes by doubling them
          const escaped = value.replace(/"/g, '""');
          return `"${escaped}"`;
        }

        return value;
      })
      .join(delimiter);
  }
}
