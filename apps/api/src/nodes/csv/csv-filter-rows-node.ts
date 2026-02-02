import type { NodeExecution, NodeType, Table } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../../runtime/node-types";

type FilterOperator =
  | "equals"
  | "notEquals"
  | "contains"
  | "notContains"
  | "startsWith"
  | "endsWith"
  | "greaterThan"
  | "lessThan"
  | "greaterThanOrEqual"
  | "lessThanOrEqual";

export class CsvFilterRowsNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "csv-filter-rows",
    name: "CSV Filter Rows",
    type: "csv-filter-rows",
    description: "Filter rows in a Table based on a column value condition",
    tags: ["Document", "CSV", "Filter", "Data"],
    icon: "filter",
    documentation:
      "Filters rows in a Table based on a comparison operation on a specified column. Returns a new Table with only matching rows.",
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
        description: "Column name to filter by",
        required: true,
      },
      {
        name: "operator",
        type: "string",
        description:
          "Comparison operator: equals, notEquals, contains, notContains, startsWith, endsWith, greaterThan, lessThan, greaterThanOrEqual, lessThanOrEqual",
        required: true,
      },
      {
        name: "value",
        type: "string",
        description: "Value to compare against",
        required: true,
      },
    ],
    outputs: [
      {
        name: "table",
        type: "json",
        description: "Filtered Table with matching rows",
      },
      {
        name: "matchCount",
        type: "number",
        description: "Number of rows that matched the filter",
        hidden: true,
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { table, column, operator, value } = context.inputs;

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

      if (!operator || typeof operator !== "string") {
        return this.createErrorResult(
          "Missing or invalid required input: operator"
        );
      }

      if (value === null || value === undefined) {
        return this.createErrorResult("Missing required input: value");
      }

      if (typeof value !== "string") {
        return this.createErrorResult(
          `Invalid input type for value: expected string, got ${typeof value}`
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

      // Validate operator
      const validOperators: FilterOperator[] = [
        "equals",
        "notEquals",
        "contains",
        "notContains",
        "startsWith",
        "endsWith",
        "greaterThan",
        "lessThan",
        "greaterThanOrEqual",
        "lessThanOrEqual",
      ];

      if (!validOperators.includes(operator as FilterOperator)) {
        return this.createErrorResult(
          `Invalid operator '${operator}'. Valid operators: ${validOperators.join(", ")}`
        );
      }

      // Filter data
      const filteredData = tableObj.data.filter((row) => {
        const cellValue = row[column];
        return this.matchesFilter(cellValue, value, operator as FilterOperator);
      });

      const filteredTable: Table = {
        name: tableObj.name,
        fields: tableObj.fields,
        data: filteredData,
      };

      return this.createSuccessResult({
        table: filteredTable,
        matchCount: filteredData.length,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(`Error filtering rows: ${error.message}`);
    }
  }

  private matchesFilter(
    cellValue: unknown,
    filterValue: string,
    operator: FilterOperator
  ): boolean {
    // Convert cell value to string for comparison
    const cellStr = String(cellValue ?? "");
    const filterStr = filterValue;

    switch (operator) {
      case "equals":
        return cellStr === filterStr;

      case "notEquals":
        return cellStr !== filterStr;

      case "contains":
        return cellStr.includes(filterStr);

      case "notContains":
        return !cellStr.includes(filterStr);

      case "startsWith":
        return cellStr.startsWith(filterStr);

      case "endsWith":
        return cellStr.endsWith(filterStr);

      case "greaterThan": {
        const cellNum = Number(cellValue);
        const filterNum = Number(filterValue);
        if (isNaN(cellNum) || isNaN(filterNum)) return false;
        return cellNum > filterNum;
      }

      case "lessThan": {
        const cellNum = Number(cellValue);
        const filterNum = Number(filterValue);
        if (isNaN(cellNum) || isNaN(filterNum)) return false;
        return cellNum < filterNum;
      }

      case "greaterThanOrEqual": {
        const cellNum = Number(cellValue);
        const filterNum = Number(filterValue);
        if (isNaN(cellNum) || isNaN(filterNum)) return false;
        return cellNum >= filterNum;
      }

      case "lessThanOrEqual": {
        const cellNum = Number(cellValue);
        const filterNum = Number(filterValue);
        if (isNaN(cellNum) || isNaN(filterNum)) return false;
        return cellNum <= filterNum;
      }

      default:
        return false;
    }
  }
}
