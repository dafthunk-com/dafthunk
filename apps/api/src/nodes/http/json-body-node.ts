import { ExecutableNode, NodeContext } from "@dafthunk/runtime";
import { Node, NodeExecution, NodeType } from "@dafthunk/types";

export class JsonBodyNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "body-json",
    name: "JSON Body",
    type: "body-json",
    description: "Extracts JSON data from the body of the HTTP request.",
    tags: ["Data", "Parameter", "JSON"],
    icon: "braces",
    documentation:
      "This node extracts JSON data from the HTTP request body, supporting both required and optional JSON payloads.",
    inlinable: true,
    asTool: true,
    compatibility: ["http_webhook", "http_request"],
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
      if (body === undefined) {
        if (isRequired) {
          return this.createErrorResult(
            "JSON body is required but not provided"
          );
        }
        return this.createSuccessResult({
          value: undefined,
        });
      }

      // Handle BlobParameter (production) or plain objects (legacy/tests)
      let parsedValue: any;

      // Check if body is a BlobParameter
      if (
        typeof body === "object" &&
        body !== null &&
        "data" in body &&
        body.data instanceof Uint8Array &&
        "mimeType" in body
      ) {
        // Parse JSON from BlobParameter
        try {
          const textDecoder = new TextDecoder();
          const bodyString = textDecoder.decode(body.data);
          parsedValue = JSON.parse(bodyString);
        } catch (parseError) {
          return this.createErrorResult(
            `Failed to parse JSON body: ${parseError instanceof Error ? parseError.message : String(parseError)}`
          );
        }
      } else {
        // Legacy format: body is already parsed (for backward compatibility and tests)
        parsedValue = body;
      }

      return this.createSuccessResult({
        value: parsedValue,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
