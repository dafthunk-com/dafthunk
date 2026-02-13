import { ExecutableNode, NodeContext } from "@dafthunk/runtime";
import { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * Dataset Delete File node implementation
 * This node deletes a file from a dataset in the DATASETS R2 bucket
 */
export class DatasetDeleteFileNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "dataset-delete-file",
    name: "Dataset Delete File",
    type: "dataset-delete-file",
    description: "Delete a file from a dataset",
    tags: ["Dataset", "Files", "Delete"],
    icon: "trash",
    documentation:
      "This node deletes a specific file from a dataset. The file is permanently removed from R2 storage.",
    usage: 3,
    asTool: true,
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
        description: "Name of the file to delete",
        required: true,
      },
    ],
    outputs: [
      {
        name: "success",
        type: "boolean",
        description: "Whether the deletion was successful",
      },
      {
        name: "path",
        type: "string",
        description: "The R2 path of the deleted file",
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

      await dataset.deleteFile(filename);

      return this.createSuccessResult({
        success: true,
        path: `${datasetId}/${filename}`,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Failed to delete file"
      );
    }
  }
}
