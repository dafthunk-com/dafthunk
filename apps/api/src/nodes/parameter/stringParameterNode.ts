import { Node, NodeType, NodeExecution } from "@dafthunk/types";
import { ExecutableNode, NodeContext } from "../types";

export class StringParameterNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    type: "parameter.string",
    id: "parameter.string",
    name: "HTTP Form String Parameter",
    description:
      "Extracts a string parameter from the HTTP request's form data. The parameter will be looked up in the request body using the specified name.",
    category: "parameter",
    icon: "text",
    inputs: [
      {
        name: "name",
        type: "string",
        description:
          "The name of the form field to extract from the HTTP request body",
        required: true,
      },
      {
        name: "required",
        type: "boolean",
        description:
          "Whether the form field is required. If false, undefined will be returned when the field is missing",
        value: true,
      },
    ],
    outputs: [
      {
        name: "value",
        type: "string",
        description:
          "The string value from the form field, or undefined if the field is optional and not provided",
      },
    ],
  };

  constructor(node: Node) {
    super(node);
  }

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const formFieldName = this.node.inputs.find(
        (input) => input.name === "name"
      )?.value as string;
      if (!formFieldName) {
        throw new Error("Form field name is required");
      }

      const isRequired =
        (this.node.inputs.find((input) => input.name === "required")
          ?.value as boolean) ?? true;

      if (!context.httpRequest) {
        if (isRequired) {
          throw new Error(
            "HTTP request information is required but not provided"
          );
        }
        return this.createSuccessResult({
          value: undefined,
        });
      }

      // Try to get the value from the request body (form data)
      const value = context.httpRequest.body?.[formFieldName];
      if (value === undefined) {
        if (isRequired) {
          throw new Error(
            `Form field "${formFieldName}" is required but not provided in the request`
          );
        }
        return this.createSuccessResult({
          value: undefined,
        });
      }

      if (typeof value !== "string") {
        throw new Error(`Form field "${formFieldName}" must be a string`);
      }

      return this.createSuccessResult({
        value,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
