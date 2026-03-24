import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType, Schema } from "@dafthunk/types";
import { resolveAndValidateRecords } from "../../utils/schema-validation";

export class DatabaseBuildTableNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "database-build-table",
    name: "Database Build Table",
    type: "database-build-table",
    description: "Builds a Table from a schema and data.",
    tags: ["Database", "Table", "Build"],
    icon: "database",
    documentation:
      "Constructs a Table from a schema and data rows. Use this to build tables dynamically or to reconstruct tables after manipulating their parts.",
    asTool: true,
    inputs: [
      {
        name: "schema",
        type: "json",
        description:
          "Schema with name and fields: {name: string, fields: [{name: string, type: string}]}",
        required: true,
      },
      {
        name: "schemaId",
        type: "schema",
        description: "Optional schema to validate and coerce data rows.",
        required: false,
        hidden: true,
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
        name: "schema",
        type: "json",
        description:
          "Schema with name and fields: {name: string, fields: [{name: string, type: string}]}",
      },
      {
        name: "data",
        type: "json",
        description: "Array of data rows (objects).",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const { schema, data, schemaId } = context.inputs;

    // Validate required inputs
    if (!schema) {
      return this.createErrorResult("'schema' is a required input.");
    }

    const typedSchema = schema as Schema;
    if (
      !typedSchema.name ||
      !typedSchema.fields ||
      !Array.isArray(typedSchema.fields)
    ) {
      return this.createErrorResult(
        "Invalid schema: must include 'name' (string) and 'fields' (array)."
      );
    }

    for (let i = 0; i < typedSchema.fields.length; i++) {
      const field = typedSchema.fields[i];
      if (!field || typeof field !== "object" || !field.name || !field.type) {
        return this.createErrorResult(
          `Invalid field at index ${i}: must have 'name' and 'type' properties.`
        );
      }
    }

    if (!data) {
      return this.createErrorResult("'data' is a required input.");
    }

    if (!Array.isArray(data)) {
      return this.createErrorResult("'data' must be an array.");
    }

    const { records: validatedData, error: schemaError } =
      await resolveAndValidateRecords(
        context,
        schemaId,
        data as Record<string, unknown>[]
      );
    if (schemaError) {
      return this.createErrorResult(schemaError);
    }

    return this.createSuccessResult({
      schema: typedSchema,
      data: validatedData,
    });
  }
}
