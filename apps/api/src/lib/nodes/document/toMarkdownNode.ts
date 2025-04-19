import { ExecutableNode, DocumentValue, StringValue } from "../types";
import { NodeContext, ExecutionResult } from "../types";
import { NodeType } from "../../api/types";

/**
 * ToMarkdown node implementation
 * Converts various document formats to Markdown using Cloudflare Workers AI
 */
export class ToMarkdownNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "to-markdown",
    name: "To Markdown",
    description:
      "Converts various document formats to Markdown using Cloudflare Workers AI",
    category: "Document",
    icon: "file-text",
    inputs: [
      {
        name: "document",
        type: DocumentValue,
        description: "The document to convert to Markdown",
        required: true,
      },
    ],
    outputs: [
      {
        name: "markdown",
        type: StringValue,
        description: "The converted document in Markdown format",
      },
    ],
  };

  async execute(context: NodeContext): Promise<ExecutionResult> {
    try {
      const documentInput = context.inputs.document as {
        data: Uint8Array;
        mimeType: string;
      };

      // Validate using DocumentValue
      const documentValue = new DocumentValue(documentInput);
      const validation = documentValue.validate();
      if (!validation.isValid) {
        return this.createErrorResult(
          validation.error || "Invalid document data"
        );
      }

      if (!context.env?.AI) {
        return this.createErrorResult("AI service is not available");
      }

      const extension = this.getFileExtension(documentInput.mimeType);

      // Create a Blob from the document data
      const blob = new Blob([documentInput.data.buffer], {
        type: documentInput.mimeType,
      });

      // Call the toMarkdown API
      const result = await context.env.AI.toMarkdown([
        {
          name: `document.${extension}`,
          blob,
        },
      ]);

      if (!result || result.length === 0) {
        return this.createErrorResult("Failed to convert document to Markdown");
      }

      return this.createSuccessResult({
        markdown: new StringValue(result[0].data),
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  private getFileExtension(mimeType: string): string {
    switch (mimeType) {
      // PDF Documents
      case "application/pdf":
        return "pdf";

      // Images
      case "image/jpeg":
        return "jpeg";
      case "image/jpg":
        return "jpg";
      case "image/png":
        return "png";
      case "image/webp":
        return "webp";
      case "image/svg+xml":
        return "svg";

      // HTML Documents
      case "text/html":
        return "html";

      // XML Documents
      case "application/xml":
        return "xml";

      // Microsoft Office Documents
      case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        return "xlsx";
      case "application/vnd.ms-excel.sheet.macroenabled.12":
        return "xlsm";
      case "application/vnd.ms-excel.sheet.binary.macroenabled.12":
        return "xlsb";
      case "application/vnd.ms-excel":
        return "xls";

      // Open Document Format
      case "application/vnd.oasis.opendocument.spreadsheet":
        return "ods";

      // CSV
      case "text/csv":
        return "csv";

      // Apple Documents
      case "application/vnd.apple.numbers":
        return "numbers";

      default:
        throw new Error(`Unsupported mime type: ${mimeType}`);
    }
  }
}
