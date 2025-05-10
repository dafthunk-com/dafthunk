import { Node, NodeType, NodeExecution } from "@dafthunk/types";
import { ExecutableNode, NodeContext } from "../types";

export class BooleanParameterNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    type: "parameter.boolean",
    id: "parameter.boolean",
    name: "HTTP Form Boolean Parameter",
    description:
      "Extracts a boolean parameter from the HTTP request's form data. The parameter will be looked up in the request body using the specified name.",
    category: "parameter",
    icon: "toggle",
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
        type: "boolean",
        description:
          "The boolean value from the form field, or undefined if the field is optional and not provided",
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
      const rawValue = context.httpRequest.body?.[formFieldName];
      if (rawValue === undefined) {
        if (isRequired) {
          throw new Error(
            `Form field "${formFieldName}" is required but not provided in the request`
          );
        }
        return this.createSuccessResult({
          value: undefined,
        });
      }

      // Parse the value as a boolean
      let boolValue: boolean;

      if (typeof rawValue === "boolean") {
        boolValue = rawValue;
      } else if (typeof rawValue === "string") {
        const lowercaseValue = rawValue.toLowerCase().trim();
        if (
          lowercaseValue === "true" ||
          lowercaseValue === "1" ||
          lowercaseValue === "yes"
        ) {
          boolValue = true;
        } else if (
          lowercaseValue === "false" ||
          lowercaseValue === "0" ||
          lowercaseValue === "no"
        ) {
          boolValue = false;
        } else {
          throw new Error(
            `Form field "${formFieldName}" must be a valid boolean value (true/false, 1/0, yes/no)`
          );
        }
      } else if (typeof rawValue === "number") {
        boolValue = rawValue !== 0;
      } else {
        throw new Error(
          `Form field "${formFieldName}" must be a valid boolean value`
        );
      }

      return this.createSuccessResult({
        value: boolValue,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
