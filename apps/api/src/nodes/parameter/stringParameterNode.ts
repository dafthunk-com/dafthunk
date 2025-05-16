import { Node, NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

export class StringParameterNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    type: "parameter.string",
    id: "parameter.string",
    name: "String Parameter",
    description:
      "Extracts a string parameter from the HTTP request. The parameter will be looked up in form data and request body.",
    category: "Parameter",
    icon: "text",
    inputs: [
      {
        name: "name",
        type: "string",
        description:
          "The name of the parameter to extract from the HTTP request",
        required: true,
      },
      {
        name: "required",
        type: "boolean",
        description:
          "Whether the parameter is required. If false, undefined will be returned when missing",
        value: true,
      },
    ],
    outputs: [
      {
        name: "value",
        type: "string",
        description:
          "The string value from the parameter, or undefined if optional and not provided",
      },
    ],
  };

  constructor(node: Node) {
    super(node);
  }

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const paramName = this.node.inputs.find((input) => input.name === "name")
        ?.value as string;
      if (!paramName) {
        throw new Error("Parameter name is required");
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

      // Try to get the value from the request body (form data or JSON)
      const value =
        context.httpRequest?.formData?.[paramName] ??
        context.httpRequest?.body?.[paramName];
      if (value === undefined) {
        if (isRequired) {
          throw new Error(
            `Parameter "${paramName}" is required but not provided in the request`
          );
        }
        return this.createSuccessResult({
          value: undefined,
        });
      }

      if (typeof value !== "string") {
        throw new Error(`Parameter "${paramName}" must be a string`);
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
