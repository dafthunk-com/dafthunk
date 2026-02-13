import { ExecutableNode, NodeContext } from "@dafthunk/runtime";
import { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * Dataset Download File node implementation
 * This node downloads a file from a dataset in the DATASETS R2 bucket
 */
export class DatasetDownloadFileNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "dataset-download-file",
    name: "Dataset Download File",
    type: "dataset-download-file",
    description: "Download a file from a dataset",
    tags: ["Dataset", "Files", "Download"],
    icon: "download",
    documentation:
      "This node downloads and retrieves the content of a file from a dataset.",
    usage: 10,
    inputs: [
      {
        name: "datasetId",
        type: "dataset",
        description: "Selected dataset ID",
        hidden: true,
        required: true,
      },
      {
        name: "filename",
        type: "string",
        description: "Name of the file to download",
        required: true,
      },
    ],
    outputs: [
      {
        name: "content",
        type: "blob",
        description: "The file content",
      },
      {
        name: "contentType",
        type: "string",
        description: "MIME type of the file",
      },
      {
        name: "size",
        type: "number",
        description: "Size of the file in bytes",
      },
      {
        name: "filename",
        type: "string",
        description: "Name of the downloaded file",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { datasetId, filename } = context.inputs;
      const { organizationId } = context;

      // Validate required inputs
      if (!datasetId || typeof datasetId !== "string") {
        return this.createErrorResult("Dataset ID is required");
      }

      if (!filename || typeof filename !== "string") {
        return this.createErrorResult("Filename is required");
      }

      if (!organizationId || typeof organizationId !== "string") {
        return this.createErrorResult("Organization ID is required");
      }

      if (!context.datasetService) {
        return this.createErrorResult("Dataset service not available");
      }
      const dataset = await context.datasetService.resolve(
        datasetId,
        organizationId
      );
      if (!dataset) {
        return this.createErrorResult("Dataset not found or access denied");
      }

      const file = await dataset.getFile(filename);
      if (!file) {
        return this.createErrorResult("File not found");
      }

      return this.createSuccessResult({
        content: file.data,
        contentType: file.mimeType,
        size: file.size,
        filename,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Failed to download file"
      );
    }
  }
}
