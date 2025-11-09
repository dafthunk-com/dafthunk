import type {
  NodeExecution,
  NodeType,
  Table,
  TableField,
} from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

export class DatabaseBuildTableNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "database-build-table",
    name: "Database Build Table",
    type: "database-build-table",
    description: "Builds a Table object from name, fields, and data.",
    tags: ["Database", "Table", "Build"],
    icon: "database",
    documentation:
      "Constructs a Table object from its components: table name, field definitions, and data rows. Use this to build tables dynamically or to reconstruct tables after manipulating their parts.",
    asTool: true,
    inputs: [
      {
        name: "name",
        type: "string",
        description: "Table name.",
        required: true,
      },
      {
        name: "fields",
        type: "json",
        description:
          "Array of field definitions: [{name: string, type: string}]",
        required: true,
      },
      {
        name: "data",
        type: "json",
        description: "Array of data rows (objects).",
        required: true,
      },
    ],
    outputs: [
      {
        name: "table",
        type: "json",
        description:
          "Table object: {name: string, fields: [{name: string, type: string}], data: object[]}",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const { name, fields, data } = context.inputs;

    // Validate required inputs
    if (!name) {
      return this.createErrorResult("'name' is a required input.");
    }

    if (!fields) {
      return this.createErrorResult("'fields' is a required input.");
    }

    if (!data) {
      return this.createErrorResult("'data' is a required input.");
    }

    // Validate fields structure
    if (!Array.isArray(fields)) {
      return this.createErrorResult("'fields' must be an array.");
    }

    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      if (!field || typeof field !== "object" || !field.name || !field.type) {
        return this.createErrorResult(
          `Invalid field at index ${i}: must have 'name' and 'type' properties.`
        );
      }
    }

    // Validate data structure
    if (!Array.isArray(data)) {
      return this.createErrorResult("'data' must be an array.");
    }

    // Build the table object
    const table: Table = {
      name: String(name),
      fields: fields as TableField[],
      data: data as Record<string, unknown>[],
    };

    return this.createSuccessResult({
      table,
    });
  }
}
