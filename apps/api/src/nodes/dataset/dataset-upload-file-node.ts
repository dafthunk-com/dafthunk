import { NodeExecution, NodeType } from "@dafthunk/types";

import { createDatabase, getDataset } from "../../db";
import { ExecutableNode, NodeContext } from "../../runtime/node-types";

/**
 * Dataset Upload File node implementation
 * This node uploads a file to a dataset using the DATASETS R2 bucket
 */
export class DatasetUploadFileNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "dataset-upload-file",
    name: "Dataset Upload File",
    type: "dataset-upload-file",
    description: "Upload a file to a dataset",
    tags: ["Dataset", "Files", "Upload"],
    icon: "upload",
    documentation:
      "This node uploads a file to a dataset. The file is stored in R2 with multi-tenant isolation.",
    usage: 10,
    inputs: [
      {
        name: "datasetId",
        type: "string",
        description: "Selected dataset ID",
        hidden: true,
        required: true,
      },
      {
        name: "filename",
        type: "string",
        description: "Name of the file to upload",
        required: true,
      },
      {
        name: "content",
        type: "blob",
        description: "File content to upload",
        required: true,
      },
      {
        name: "contentType",
        type: "string",
        description: "MIME type of the file",
        value: "application/octet-stream",
      },
    ],
    outputs: [
      {
        name: "success",
        type: "boolean",
        description: "Whether the upload was successful",
      },
      {
        name: "path",
        type: "string",
        description: "The R2 path where the file was stored",
      },
      {
        name: "filename",
        type: "string",
        description: "The name of the uploaded file",
      },
      {
        name: "size",
        type: "number",
        description: "Size of the uploaded file in bytes",
        hidden: true,
      },
      {
        name: "contentType",
        type: "string",
        description: "Content type of the uploaded file",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { datasetId, filename, content, contentType } = context.inputs;
      const { organizationId } = context;

      // Validate required inputs
      if (!datasetId || typeof datasetId !== "string") {
        return this.createErrorResult("Dataset ID is required");
      }

      if (!filename || typeof filename !== "string") {
        return this.createErrorResult("Filename is required");
      }

      if (!content) {
        return this.createErrorResult("File content is required");
      }

      if (!organizationId || typeof organizationId !== "string") {
        return this.createErrorResult("Organization ID is required");
      }

      // Verify dataset exists and belongs to organization
      const db = createDatabase(context.env.DB);
      const dataset = await getDataset(db, datasetId, organizationId);
      if (!dataset) {
        return this.createErrorResult("Dataset not found or access denied");
      }

      // Create the R2 path following the multitenant pattern
      const r2Path = `${datasetId}/${filename}`;

      // Convert content to ArrayBuffer if it's not already
      let arrayBuffer: ArrayBuffer;
      if (content instanceof ArrayBuffer) {
        arrayBuffer = content;
      } else if (typeof content === "string") {
        arrayBuffer = new TextEncoder().encode(content).buffer as ArrayBuffer;
      } else if (content instanceof Uint8Array) {
        arrayBuffer = content.buffer as ArrayBuffer;
      } else {
        return this.createErrorResult("Invalid content type");
      }

      // Upload to R2
      await context.env.DATASETS.put(r2Path, arrayBuffer, {
        httpMetadata: {
          contentType: contentType || "application/octet-stream",
        },
      });

      return this.createSuccessResult({
        success: true,
        path: r2Path,
        filename,
        size: arrayBuffer.byteLength,
        contentType: contentType || "application/octet-stream",
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Failed to upload file"
      );
    }
  }
}
