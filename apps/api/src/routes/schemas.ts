import type {
  CreateSchemaResponse,
  DeleteSchemaResponse,
  GetSchemaResponse,
  ListSchemasResponse,
  SchemaEntity,
  UpdateSchemaResponse,
} from "@dafthunk/types";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { v7 as uuid } from "uuid";
import { z } from "zod";

import { jwtMiddleware } from "../auth";
import type { ApiContext } from "../context";
import {
  createDatabase,
  createSchemaRecord,
  deleteSchemaRecord,
  getSchema,
  getSchemas,
  updateSchemaRecord,
} from "../db";

const fieldSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["string", "integer", "number", "boolean", "datetime", "json"]),
  required: z.boolean().optional(),
});

const uniqueFields = (fields: z.infer<typeof fieldSchema>[]) => {
  const names = fields.map((f) => f.name.trim());
  return new Set(names).size === names.length;
};

const schemaRoutes = new Hono<ApiContext>();

schemaRoutes.use("*", jwtMiddleware);

function toSchemaEntity(row: {
  id: string;
  name: string;
  description: string;
  fields: string;
  createdAt: Date;
  updatedAt: Date;
}): SchemaEntity {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    fields: JSON.parse(row.fields),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * List all schemas for the current organization
 */
schemaRoutes.get("/", async (c) => {
  const db = createDatabase(c.env.DB);
  const organizationId = c.get("organizationId")!;

  const allSchemas = await getSchemas(db, organizationId);

  const response: ListSchemasResponse = {
    schemas: allSchemas.map(toSchemaEntity),
  };
  return c.json(response);
});

/**
 * Create a new schema
 */
schemaRoutes.post(
  "/",
  zValidator(
    "json",
    z
      .object({
        name: z.string().min(1, "Schema name is required"),
        description: z.string().optional(),
        fields: z.array(fieldSchema).min(1, "At least one field is required"),
      })
      .refine((data) => uniqueFields(data.fields), {
        message: "Field names must be unique",
        path: ["fields"],
      })
  ),
  async (c) => {
    const data = c.req.valid("json");
    const now = new Date();
    const organizationId = c.get("organizationId")!;
    const db = createDatabase(c.env.DB);

    const newSchema = await createSchemaRecord(db, {
      id: uuid(),
      name: data.name,
      description: data.description || "",
      fields: JSON.stringify(data.fields),
      organizationId,
      createdAt: now,
      updatedAt: now,
    });

    const response: CreateSchemaResponse = {
      schema: toSchemaEntity(newSchema),
    };
    return c.json(response, 201);
  }
);

/**
 * Get a specific schema by ID
 */
schemaRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);
  const organizationId = c.get("organizationId")!;

  const schema = await getSchema(db, id, organizationId);
  if (!schema) {
    return c.json({ error: "Schema not found" }, 404);
  }

  const response: GetSchemaResponse = {
    schema: toSchemaEntity(schema),
  };
  return c.json(response);
});

/**
 * Update a schema by ID
 */
schemaRoutes.put(
  "/:id",
  zValidator(
    "json",
    z
      .object({
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        fields: z.array(fieldSchema).min(1).optional(),
      })
      .refine((data) => !data.fields || uniqueFields(data.fields), {
        message: "Field names must be unique",
        path: ["fields"],
      })
  ),
  async (c) => {
    const id = c.req.param("id");
    const db = createDatabase(c.env.DB);
    const organizationId = c.get("organizationId")!;

    const existing = await getSchema(db, id, organizationId);
    if (!existing) {
      return c.json({ error: "Schema not found" }, 404);
    }

    const data = c.req.valid("json");
    const now = new Date();

    const updates: Record<string, unknown> = { updatedAt: now };
    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    if (data.fields !== undefined) updates.fields = JSON.stringify(data.fields);

    const updated = await updateSchemaRecord(db, id, organizationId, updates);

    const response: UpdateSchemaResponse = {
      schema: toSchemaEntity(updated),
    };
    return c.json(response);
  }
);

/**
 * Delete a schema by ID
 */
schemaRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);
  const organizationId = c.get("organizationId")!;

  const existing = await getSchema(db, id, organizationId);
  if (!existing) {
    return c.json({ error: "Schema not found" }, 404);
  }

  const deleted = await deleteSchemaRecord(db, id, organizationId);
  if (!deleted) {
    return c.json({ error: "Failed to delete schema" }, 500);
  }

  const response: DeleteSchemaResponse = { success: true };
  return c.json(response);
});

export default schemaRoutes;
