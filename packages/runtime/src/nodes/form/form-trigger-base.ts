import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { FieldType, NodeExecution, Schema } from "@dafthunk/types";

/**
 * Maps a schema FieldType to a workflow Parameter type string. Shared with the
 * editor widget so the form trigger's outputs adopt the schema's field types.
 */
export const FIELD_TYPE_TO_PARAMETER_TYPE: Record<FieldType, string> = {
  string: "string",
  integer: "number",
  number: "number",
  boolean: "boolean",
  datetime: "date",
  json: "json",
  image: "image",
  document: "document",
  audio: "audio",
  video: "video",
  blob: "blob",
};

/**
 * Base for the form trigger nodes (`form-request` / `form-webhook`). The public
 * form route validates the submission against the node's schema and injects it
 * as `context.formSubmission`. Each schema field becomes a named, typed output —
 * the same shape as `JsonSchemaExtractNode`, but sourced from the trigger
 * instead of a wire.
 */
export abstract class FormTriggerNode extends ExecutableNode {
  async execute(context: NodeContext): Promise<NodeExecution> {
    const schemaInput = context.inputs.schema;

    if (
      !schemaInput ||
      typeof schemaInput !== "object" ||
      !("fields" in (schemaInput as object))
    ) {
      return this.createErrorResult("A schema must be selected.");
    }

    const schema = schemaInput as Schema;
    const record = context.formSubmission?.record ?? {};
    const outputs: Record<string, unknown> = {};

    for (const field of schema.fields) {
      outputs[field.name] = record[field.name] ?? null;
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
