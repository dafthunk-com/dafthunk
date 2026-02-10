import { NodeExecution, NodeType } from "@dafthunk/types";

import { createDatabase, getDataset } from "../../db";
import { ExecutableNode, NodeContext } from "../../runtime/node-types";

/**
 * Dataset List Files node implementation
 * This node lists all files in a dataset from the DATASETS R2 bucket
 */
export class DatasetListFilesNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "dataset-list-files",
    name: "Dataset List Files",
    type: "dataset-list-files",
    description: "List all files in a dataset",
    tags: ["Dataset", "Files", "List"],
    icon: "list",
    documentation:
      "This node lists all files stored in a dataset. Returns an array of files with their metadata.",
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
    ],
    outputs: [
      {
        name: "files",
        type: "json",
        description: "Array of files in the dataset",
      },
      {
        name: "count",
        type: "number",
        description: "Number of files in the dataset",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { datasetId } = context.inputs;
      const { organizationId } = context;

      // Validate required inputs
      if (!datasetId || typeof datasetId !== "string") {
        return this.createErrorResult("Dataset ID is required");
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

      // List objects in the dataset's directory
      const prefix = `${datasetId}/`;
      const listed = await context.env.DATASETS.list({ prefix });

      const files = listed.objects.map((obj) => ({
        key: obj.key,
        filename: obj.key.replace(prefix, ""),
        size: obj.size,
        uploaded: obj.uploaded.toISOString(),
      }));

      return this.createSuccessResult({
        files,
        count: files.length,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error ? error.message : "Failed to list files"
      );
    }
  }
}
