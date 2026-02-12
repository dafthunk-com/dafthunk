import { ExecutableNode, NodeContext } from "@dafthunk/runtime";
import type {
  NodeExecution,
  NodeType,
  Table,
  TableField,
} from "@dafthunk/types";

export class CsvParseNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "csv-parse",
    name: "CSV Parse",
    type: "csv-parse",
    description: "Parse a CSV string into a Table with schema and data",
    tags: ["Document", "CSV", "Parse", "Data"],
    icon: "file-spreadsheet",
    documentation:
      "Parses a CSV string into a structured Table format with field definitions and data rows. Automatically infers field types from the data.",
    asTool: true,
    inputs: [
      {
        name: "csv",
        type: "string",
        description: "The CSV string to parse",
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
        name: "hasHeader",
        type: "boolean",
        description: "Whether the first row contains headers",
        value: true,
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "table",
        type: "json",
        description:
          "Table with fields and data: {name: string, fields: [{name: string, type: string}], data: object[]}",
      },
      {
        name: "rowCount",
        type: "number",
        description: "Number of data rows parsed",
        hidden: true,
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { csv, delimiter = ",", hasHeader = true } = context.inputs;

      if (csv === null || csv === undefined) {
        return this.createErrorResult("Missing required input: csv");
      }

      if (typeof csv !== "string") {
        return this.createErrorResult(
          `Invalid input type for csv: expected string, got ${typeof csv}`
        );
      }

      if (typeof delimiter !== "string" || delimiter.length !== 1) {
        return this.createErrorResult(
          "Delimiter must be a single character string"
        );
      }

      if (typeof hasHeader !== "boolean") {
        return this.createErrorResult(
          `Invalid input type for hasHeader: expected boolean, got ${typeof hasHeader}`
        );
      }

      // Parse CSV
      const lines = csv.trim().split(/\r?\n/);

      if (lines.length === 0) {
        return this.createErrorResult("CSV is empty");
      }

      // Parse rows
      const rows: string[][] = [];
      for (const line of lines) {
        if (line.trim() === "") continue;
        rows.push(this.parseCsvLine(line, delimiter));
      }

      if (rows.length === 0) {
        return this.createErrorResult("No valid rows found in CSV");
      }

      let headers: string[];
      let dataRows: string[][];

      if (hasHeader) {
        headers = rows[0];
        dataRows = rows.slice(1);
      } else {
        // Generate column names: column_0, column_1, etc.
        const columnCount = rows[0].length;
        headers = Array.from({ length: columnCount }, (_, i) => `column_${i}`);
        dataRows = rows;
      }

      // Build data as array of objects
      const data: Record<string, unknown>[] = dataRows.map((row) => {
        const obj: Record<string, unknown> = {};
        headers.forEach((header, index) => {
          obj[header] = this.inferValue(row[index] || "");
        });
        return obj;
      });

      // Infer field types from first data row
      const fields: TableField[] = headers.map((header) => {
        const sampleValue = data[0]?.[header];
        return {
          name: header,
          type: this.inferType(sampleValue),
        };
      });

      const table: Table = {
        name: "csv_data",
        fields,
        data,
      };

      return this.createSuccessResult({
        table,
        rowCount: data.length,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(`Error parsing CSV: ${error.message}`);
    }
  }

  private parseCsvLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++;
        } else {
          // Toggle quotes
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  }

  private inferValue(value: string): unknown {
    const trimmed = value.trim();

    // Empty string
    if (trimmed === "") return "";

    // Boolean
    if (trimmed.toLowerCase() === "true") return true;
    if (trimmed.toLowerCase() === "false") return false;

    // Number
    const num = Number(trimmed);
    if (!isNaN(num) && trimmed !== "") return num;

    // String (default)
    return trimmed;
  }

  private inferType(value: unknown): TableField["type"] {
    if (typeof value === "boolean") return "boolean";
    if (typeof value === "number") {
      return Number.isInteger(value) ? "integer" : "number";
    }
    // Check if it's a date string
    if (typeof value === "string" && this.isDateString(value)) {
      return "datetime";
    }
    return "string";
  }

  private isDateString(value: string): boolean {
    // Simple check for common date formats
    const date = new Date(value);
    return !isNaN(date.getTime()) && value.match(/\d{4}-\d{2}-\d{2}/) !== null;
  }
}
