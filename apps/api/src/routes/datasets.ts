import {
  CreateDatasetRequest,
  CreateDatasetResponse,
  DeleteDatasetResponse,
  GetDatasetResponse,
  ListDatasetsResponse,
  UpdateDatasetRequest,
  UpdateDatasetResponse,
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

export default datasetRoutes; 