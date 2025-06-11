import {
  CreateDatasetRequest,
  CreateDatasetResponse,
  DeleteDatasetResponse,
  GetDatasetResponse,
  ListDatasetsResponse,
  UpdateDatasetRequest,
  UpdateDatasetResponse,
  ListDatasetFilesResponse,
  UploadDatasetFileResponse,
  DeleteDatasetFileResponse,
} from "@dafthunk/types";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { v7 as uuid } from "uuid";
import { z } from "zod";

import { jwtMiddleware } from "../auth";
import { ApiContext } from "../context";
import {
  createDatabase,
  createHandle,
  createDataset,
  deleteDataset,
  getDataset,
  getDatasets,
  updateDataset,
} from "../db";

// Extend the ApiContext with our custom variable
type ExtendedApiContext = ApiContext & {
  Variables: {
    organizationId?: string;
  };
};

const datasetRoutes = new Hono<ExtendedApiContext>();

/**
 * List all datasets for the current organization
 */
datasetRoutes.get("/", jwtMiddleware, async (c) => {
  const db = createDatabase(c.env.DB);
  const organizationId = c.get("organizationId")!;

  const allDatasets = await getDatasets(db, organizationId);

  const response: ListDatasetsResponse = { datasets: allDatasets };
  return c.json(response);
});

/**
 * Create a new dataset for the current organization
 */
datasetRoutes.post(
  "/",
  jwtMiddleware,
  zValidator(
    "json",
    z.object({
      name: z.string().min(1, "Dataset name is required"),
    }) as z.ZodType<CreateDatasetRequest>
  ),
  async (c) => {
    const data = c.req.valid("json");
    const now = new Date();
    const organizationId = c.get("organizationId")!;
    const db = createDatabase(c.env.DB);

    const datasetId = uuid();
    const datasetName = data.name || "Untitled Dataset";
    const datasetHandle = createHandle(datasetName);

    const newDataset = await createDataset(db, {
      id: datasetId,
      name: datasetName,
      handle: datasetHandle,
      organizationId: organizationId,
      createdAt: now,
      updatedAt: now,
    });

    const response: CreateDatasetResponse = {
      id: newDataset.id,
      name: newDataset.name,
      handle: newDataset.handle,
      createdAt: newDataset.createdAt,
      updatedAt: newDataset.updatedAt,
    };

    return c.json(response, 201);
  }
);

/**
 * Get a specific dataset by ID
 */
datasetRoutes.get("/:id", jwtMiddleware, async (c) => {
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);
  const organizationId = c.get("organizationId")!;

  const dataset = await getDataset(db, id, organizationId);
  if (!dataset) {
    return c.json({ error: "Dataset not found" }, 404);
  }

  const response: GetDatasetResponse = {
    id: dataset.id,
    name: dataset.name,
    handle: dataset.handle,
    createdAt: dataset.createdAt,
    updatedAt: dataset.updatedAt,
  };

  return c.json(response);
});

/**
 * Update a dataset by ID
 */
datasetRoutes.put(
  "/:id",
  jwtMiddleware,
  zValidator(
    "json",
    z.object({
      name: z.string().min(1, "Dataset name is required"),
    }) as z.ZodType<UpdateDatasetRequest>
  ),
  async (c) => {
    const id = c.req.param("id");
    const db = createDatabase(c.env.DB);
    const organizationId = c.get("organizationId")!;

    const existingDataset = await getDataset(db, id, organizationId);
    if (!existingDataset) {
      return c.json({ error: "Dataset not found" }, 404);
    }

    const data = c.req.valid("json");
    const now = new Date();

    const updatedDataset = await updateDataset(db, id, organizationId, {
      name: data.name,
      updatedAt: now,
    });

    const response: UpdateDatasetResponse = {
      id: updatedDataset.id,
      name: updatedDataset.name,
      handle: updatedDataset.handle,
      createdAt: updatedDataset.createdAt,
      updatedAt: updatedDataset.updatedAt,
    };

    return c.json(response);
  }
);

/**
 * Delete a dataset by ID
 */
datasetRoutes.delete("/:id", jwtMiddleware, async (c) => {
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);
  const organizationId = c.get("organizationId")!;

  const existingDataset = await getDataset(db, id, organizationId);
  if (!existingDataset) {
    return c.json({ error: "Dataset not found" }, 404);
  }

  const deletedDataset = await deleteDataset(db, id, organizationId);
  if (!deletedDataset) {
    return c.json({ error: "Failed to delete dataset" }, 500);
  }

  const response: DeleteDatasetResponse = { id: deletedDataset.id };
  return c.json(response);
});

/**
 * Upload a file to a dataset
 */
datasetRoutes.post(
  "/:id/upload",
  jwtMiddleware,
  async (c) => {
    const id = c.req.param("id");
    const db = createDatabase(c.env.DB);
    const organizationId = c.get("organizationId")!;

    // Verify dataset exists and belongs to organization
    const dataset = await getDataset(db, id, organizationId);
    if (!dataset) {
      return c.json({ error: "Dataset not found" }, 404);
    }

    try {
      const formData = await c.req.formData();
      const file = formData.get("file") as File;
      
      if (!file) {
        return c.json({ error: "No file provided" }, 400);
      }

      // Create the R2 path following the multitenant pattern
      const r2Path = `${organizationId}/${id}/${file.name}`;

      // Upload to R2
      await c.env.DATASETS.put(r2Path, await file.arrayBuffer(), {
        httpMetadata: {
          contentType: file.type,
        },
      });

      const response: UploadDatasetFileResponse = {
        success: true,
        path: r2Path,
        filename: file.name,
        size: file.size,
        type: file.type,
      };

      return c.json(response);
    } catch (error) {
      console.error("Error uploading file:", error);
      return c.json({ error: "Failed to upload file" }, 500);
    }
  }
);

/**
 * List files in a dataset
 */
datasetRoutes.get(
  "/:id/files",
  jwtMiddleware,
  async (c) => {
    const id = c.req.param("id");
    const db = createDatabase(c.env.DB);
    const organizationId = c.get("organizationId")!;

    // Verify dataset exists and belongs to organization
    const dataset = await getDataset(db, id, organizationId);
    if (!dataset) {
      return c.json({ error: "Dataset not found" }, 404);
    }

    try {
      // List objects in the dataset's directory
      const prefix = `${organizationId}/${id}/`;
      const files = await c.env.DATASETS.list({ prefix });

      const response: ListDatasetFilesResponse = {
        files: files.objects.map(obj => ({
          key: obj.key,
          size: obj.size,
          uploaded: obj.uploaded.toISOString(),
        })),
      };

      return c.json(response);
    } catch (error) {
      console.error("Error listing files:", error);
      return c.json({ error: "Failed to list files" }, 500);
    }
  }
);

/**
 * Delete a file from a dataset
 */
datasetRoutes.delete(
  "/:id/files/:filename",
  jwtMiddleware,
  async (c) => {
    const id = c.req.param("id");
    const filename = c.req.param("filename");
    const db = createDatabase(c.env.DB);
    const organizationId = c.get("organizationId")!;

    // Verify dataset exists and belongs to organization
    const dataset = await getDataset(db, id, organizationId);
    if (!dataset) {
      return c.json({ error: "Dataset not found" }, 404);
    }

    try {
      const r2Path = `${organizationId}/${id}/${filename}`;
      await c.env.DATASETS.delete(r2Path);

      const response: DeleteDatasetFileResponse = {
        success: true,
        path: r2Path,
      };

      return c.json(response);
    } catch (error) {
      console.error("Error deleting file:", error);
      return c.json({ error: "Failed to delete file" }, 500);
    }
  }
);

export default datasetRoutes; 