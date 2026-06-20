import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType, Schema } from "@dafthunk/types";

/**
 * Terminal node for a synchronous `form-request` workflow. Mirrors
 * `http-response`: it defines what the submitter sees after the form runs.
 *
 * A schema is selected in the editor and the node's inputs adapt to its fields
 * (the compose direction, like `JsonSchemaComposeNode`). At runtime it combines
 * the field inputs into a single record; the form-trigger route reads this
 * node's output and returns it so the public form page can render the result
 * field-by-field.
 */
export class FormResponseNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "form-response",
    name: "Form Response",
    type: "form-response",
    description:
      "Define the result shown to the user after a synchronous Form Request submission.",
    documentation:
      "This node defines the response returned when using a synchronous Form Request trigger. " +
      "Select a schema and the node's inputs adapt to its fields; connect a value to each one. " +
      "After the form is submitted, the composed record is shown to the user formatted per the schema.",
    tags: ["Form", "Response", "HITL"],
    icon: "log-out",
    inlinable: false,
    inputs: [
      {
        name: "schema",
        type: "schema",
        description: "Schema defining the response fields",
        required: true,
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "record",
        type: "json",
        description: "The composed response record",
        hidden: true,
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
      record[field.name] = fieldInputs[field.name] ?? null;
    }

    return this.createSuccessResult({ record });
  }
}
