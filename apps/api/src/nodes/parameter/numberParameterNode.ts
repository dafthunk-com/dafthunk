import { Node, NodeType, NodeExecution } from "@dafthunk/types";
import { ExecutableNode, NodeContext } from "../types";

export class NumberParameterNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    type: "parameter.number",
    id: "parameter.number",
    name: "Number Parameter",
    description:
      "Extracts a number parameter from the HTTP request. The parameter will be looked up in form data and request body.",
    category: "Parameter",
    icon: "calculator",
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
        type: "number",
        description:
          "The number value from the parameter, or undefined if optional and not provided",
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
      const rawValue =
        context.httpRequest?.formData?.[paramName] ??
        context.httpRequest?.body?.[paramName];
      if (rawValue === undefined) {
        if (isRequired) {
          throw new Error(
            `Parameter "${paramName}" is required but not provided in the request`
          );
        }
        return this.createSuccessResult({
          value: undefined,
        });
      }

      // Parse the value as a number
      const numValue = Number(rawValue);
      if (isNaN(numValue)) {
        throw new Error(`Parameter "${paramName}" must be a valid number`);
      }

      return this.createSuccessResult({
        value: numValue,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
