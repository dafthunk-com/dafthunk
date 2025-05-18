import { Node, NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext } from "../types";

export class JsonBodyNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "parameter-json-body",
    name: "JSON Body",
    type: "parameter-json-body",
    description: "Extracts JSON data from the body of the HTTP request.",
    category: "Parameter",
    icon: "braces",
    inputs: [
      {
        name: "required",
        type: "boolean",
        description:
          "Whether the JSON data is required. If false, undefined will be returned when the data is missing",
        value: true,
      },
    ],
    outputs: [
      {
        name: "value",
        type: "json",
        description:
          "The parsed JSON data, or undefined if optional and not provided",
      },
    ],
  };

  constructor(node: Node) {
    super(node);
  }

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const isRequired =
        (this.node.inputs.find((input) => input.name === "required")
          ?.value as boolean) ?? true;

      if (!context.httpRequest) {
        if (isRequired) {
          return this.createErrorResult(
            "HTTP request information is required but not provided"
          );
        }
        return this.createSuccessResult({
          value: undefined,
        });
      }

      // Extract JSON from the request body
      const body = context.httpRequest.body;
      if (body === undefined || body === null) {
        if (isRequired) {
          return this.createErrorResult(
            "JSON body is required but not provided"
          );
        }
        return this.createSuccessResult({
          value: undefined,
        });
      }

      // The body should already be parsed by the time it reaches here
      // If it's not a valid JSON structure but required, return an error
      if (typeof body !== "object" && isRequired) {
        return this.createErrorResult("Invalid JSON body");
      }

      return this.createSuccessResult({
        value: body,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
