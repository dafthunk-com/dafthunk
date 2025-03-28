import { BaseExecutableNode } from "../baseNode";
import { NodeContext, ExecutionResult, NodeType } from "../../runtimeTypes";

export class ToMarkdownNode extends BaseExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "to-markdown",
    name: "To Markdown",
    type: "text",
    description: "Converts various document formats to Markdown using Cloudflare Workers AI",
    category: "Text",
    icon: "file-text",
    inputs: [
      {
        name: "document",
        type: "document",
        description: "The document to convert to Markdown",
        required: true,
      },
    ],
    outputs: [
      {
        name: "markdown",
        type: "string",
        description: "The converted document in Markdown format",
      },
    ],
  };

  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      let documentInput;
      try {
        if (typeof context.inputs.document !== "string") {
          return this.createErrorResult(
            `Invalid input type: expected string, got ${typeof context.inputs.document}`
          );
        }
        documentInput = JSON.parse(context.inputs.document);
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown parsing error";
        return this.createErrorResult(
          `Invalid input format: expected JSON string. Error: ${errorMessage}`
        );
      }

      const { value, mimeType } = documentInput;

      // Validate inputs
      if (typeof value !== "string") {
        return this.createErrorResult("Value must be a string");
      }

      if (typeof mimeType !== "string") {
        return this.createErrorResult("MIME type must be a string");
      }

      if (!context.env?.AI) {
        return this.createErrorResult("AI service is not available");
      }

      // Convert base64 to binary
      const binaryString = atob(value);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create a Blob from the document data
      const blob = new Blob([bytes], { type: mimeType });

      // Call the toMarkdown API
      const result = await context.env.AI.toMarkdown([
        {
          name: "document",
          blob,
        },
      ]);

      if (!result || result.length === 0) {
        return this.createErrorResult("Failed to convert document to Markdown");
      }

      return this.createSuccessResult({
        markdown: result[0].data,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
} 