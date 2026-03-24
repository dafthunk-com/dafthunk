import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { FieldType, NodeExecution, NodeType } from "@dafthunk/types";

const FIELD_TYPE_TO_PARAMETER_TYPE: Record<FieldType, string> = {
  string: "string",
  integer: "number",
  number: "number",
  boolean: "boolean",
  datetime: "date",
  json: "json",
};

/**
 * Extracts fields from a JSON record based on a schema definition.
 * The node's outputs are dynamically set by a frontend widget when
 * the user selects a schema — similar to the Replicate Model node.
 *
 * At runtime the schema is resolved via SchemaService, the record is
 * validated/coerced against it, and each field becomes a named output.
 */
export class JsonSchemaExtractNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "json-schema-extract",
    name: "JSON Schema Extract",
    type: "json-schema-extract",
    description:
      "Extract fields from a JSON record based on a schema. Outputs adapt to the selected schema.",
    documentation: `Select a schema and feed in a JSON record. The node validates the record against the schema and outputs each field individually.

### How to use

1. Select a schema from the dropdown
2. The node's outputs update to match the schema fields
3. Connect a JSON record to the **record** input
4. Each schema field becomes a separate, typed output`,
    tags: ["Data", "JSON", "Schema", "Extract"],
    icon: "braces",
    inlinable: false,
    inputs: [
      {
        name: "schemaId",
        type: "schema",
        description: "Schema that defines the record structure",
        required: true,
        hidden: true,
      },
      {
        name: "record",
        type: "json",
        description: "The JSON record to extract fields from",
        required: true,
      },
    ],
    outputs: [],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const { schemaId, record } = context.inputs;

    if (!schemaId || typeof schemaId !== "string") {
      return this.createErrorResult("A schema must be selected.");
    }

    if (!record || typeof record !== "object" || Array.isArray(record)) {
      return this.createErrorResult(
        "A JSON object is required as the record input."
      );
    }

    if (!context.schemaService) {
      return this.createErrorResult("Schema service not available.");
    }

    const schema = await context.schemaService.resolve(
      schemaId,
      context.organizationId
    );

    if (!schema) {
      return this.createErrorResult(
        `Schema '${schemaId}' not found or does not belong to your organization.`
      );
    }

    const outputs: Record<string, unknown> = {};
    const rec = record as Record<string, unknown>;

    for (const field of schema.fields) {
      const value = rec[field.name];
      outputs[field.name] = value ?? null;
    }

    return this.createSuccessResult(outputs);
  }

  /**
   * Maps a schema FieldType to a workflow Parameter type string.
   * Exposed as a static helper so the frontend can reuse the same mapping.
   */
  static fieldTypeToParameterType(fieldType: FieldType): string {
    return FIELD_TYPE_TO_PARAMETER_TYPE[fieldType] ?? "any";
  }
}
