import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type {
  FieldType,
  NodeExecution,
  NodeType,
  Schema,
} from "@dafthunk/types";

const FIELD_TYPE_TO_PARAMETER_TYPE: Record<FieldType, string> = {
  string: "string",
  integer: "number",
  number: "number",
  boolean: "boolean",
  datetime: "date",
  json: "json",
};

/**
 * Composes a JSON record from individual field inputs based on a schema definition.
 * The node's inputs are dynamically set by a frontend widget when
 * the user selects a schema — the inverse of JsonSchemaExtractNode.
 *
 * At runtime the schema is received as an inline Schema object (resolved
 * by the parameter mapper), each field is read from the dynamic inputs,
 * and a single JSON record is produced as output.
 */
export class JsonSchemaComposeNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "json-schema-compose",
    name: "JSON Schema Compose",
    type: "json-schema-compose",
    description:
      "Compose a JSON record from individual fields based on a schema. Inputs adapt to the selected schema.",
    documentation: `Select a schema and connect values to the dynamically generated inputs. The node combines them into a single JSON record.

### How to use

1. Select a schema from the dropdown
2. The node's inputs update to match the schema fields
3. Connect values to each field input
4. The output is a single JSON record containing all fields`,
    tags: ["Data", "JSON", "Schema", "Compose"],
    icon: "braces",
    inlinable: false,
    inputs: [
      {
        name: "schema",
        type: "schema",
        description: "Schema that defines the record structure",
        required: true,
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "record",
        type: "json",
        description: "The composed JSON record",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    const { schema: schemaInput, ...fieldInputs } = context.inputs;

    if (
      !schemaInput ||
      typeof schemaInput !== "object" ||
      !("fields" in (schemaInput as object))
    ) {
      return this.createErrorResult("A schema must be selected.");
    }

    const schema = schemaInput as Schema;
    const record: Record<string, unknown> = {};

    for (const field of schema.fields) {
      const value = fieldInputs[field.name];
      record[field.name] = value ?? null;
    }

    return this.createSuccessResult({ record });
  }

  /**
   * Maps a schema FieldType to a workflow Parameter type string.
   * Exposed as a static helper so the frontend can reuse the same mapping.
   */
  static fieldTypeToParameterType(fieldType: FieldType): string {
    return FIELD_TYPE_TO_PARAMETER_TYPE[fieldType] ?? "any";
  }
}
