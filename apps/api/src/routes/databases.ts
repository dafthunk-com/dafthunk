import type {
  CreateDatabaseRequest,
  CreateDatabaseResponse,
  DatabaseQueryRequest,
  DatabaseQueryResponse,
  DeleteDatabaseResponse,
  GetDatabaseResponse,
  ListDatabasesResponse,
  UpdateDatabaseRequest,
  UpdateDatabaseResponse,
} from "@dafthunk/types";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { v7 as uuid } from "uuid";
import { z } from "zod";

import { apiKeyOrJwtMiddleware, jwtMiddleware } from "../auth";
import { ApiContext } from "../context";
import {
  createDatabase,
  createDatabaseRecord,
  createHandle,
  deleteDatabaseRecord,
  getDatabase,
  getDatabases,
  updateDatabaseRecord,
} from "../db";
import { CloudflareDatabaseService } from "../runtime/database-service";
import { getAuthContext } from "../utils/auth-context";

// Extend the ApiContext with our custom variable
type ExtendedApiContext = ApiContext & {
  Variables: {
    organizationId?: string;
  };
};

const databaseRoutes = new Hono<ExtendedApiContext>();

// Apply JWT middleware to all database routes
databaseRoutes.use("*", jwtMiddleware);

/**
 * List all databases for the current organization
 */
databaseRoutes.get("/", async (c) => {
  const db = createDatabase(c.env.DB);
  const organizationId = c.get("organizationId")!;

  const allDatabases = await getDatabases(db, organizationId);

  const response: ListDatabasesResponse = { databases: allDatabases };
  return c.json(response);
});

/**
 * Create a new database for the current organization
 */
databaseRoutes.post(
  "/",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1, "Database name is required"),
    }) as z.ZodType<CreateDatabaseRequest>
  ),
  async (c) => {
    const data = c.req.valid("json");
    const now = new Date();
    const organizationId = c.get("organizationId")!;
    const db = createDatabase(c.env.DB);

    const databaseId = uuid();
    const databaseName = data.name || "Untitled Database";
    const databaseHandle = createHandle(databaseName);

    const newDatabase = await createDatabaseRecord(db, {
      id: databaseId,
      name: databaseName,
      handle: databaseHandle,
      organizationId: organizationId,
      createdAt: now,
      updatedAt: now,
    });

    const response: CreateDatabaseResponse = {
      id: newDatabase.id,
      name: newDatabase.name,
      handle: newDatabase.handle,
      createdAt: newDatabase.createdAt,
      updatedAt: newDatabase.updatedAt,
    };

    return c.json(response, 201);
  }
);

/**
 * Get a specific database by ID
 */
databaseRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);
  const organizationId = c.get("organizationId")!;

  const database = await getDatabase(db, id, organizationId);
  if (!database) {
    return c.json({ error: "Database not found" }, 404);
  }

  const response: GetDatabaseResponse = {
    id: database.id,
    name: database.name,
    handle: database.handle,
    createdAt: database.createdAt,
    updatedAt: database.updatedAt,
  };

  return c.json(response);
});

/**
 * Update a database by ID
 */
databaseRoutes.put(
  "/:id",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1, "Database name is required"),
    }) as z.ZodType<UpdateDatabaseRequest>
  ),
  async (c) => {
    const id = c.req.param("id");
    const db = createDatabase(c.env.DB);
    const organizationId = c.get("organizationId")!;

    const existingDatabase = await getDatabase(db, id, organizationId);
    if (!existingDatabase) {
      return c.json({ error: "Database not found" }, 404);
    }

    const data = c.req.valid("json");
    const now = new Date();

    const updatedDatabase = await updateDatabaseRecord(db, id, organizationId, {
      name: data.name,
      updatedAt: now,
    });

    const response: UpdateDatabaseResponse = {
      id: updatedDatabase.id,
      name: updatedDatabase.name,
      handle: updatedDatabase.handle,
      createdAt: updatedDatabase.createdAt,
      updatedAt: updatedDatabase.updatedAt,
    };

    return c.json(response);
  }
);

/**
 * Delete a database by ID
 */
databaseRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const db = createDatabase(c.env.DB);
  const organizationId = c.get("organizationId")!;

  const existingDatabase = await getDatabase(db, id, organizationId);
  if (!existingDatabase) {
    return c.json({ error: "Database not found" }, 404);
  }

  const deletedDatabase = await deleteDatabaseRecord(db, id, organizationId);
  if (!deletedDatabase) {
    return c.json({ error: "Failed to delete database" }, 500);
  }

  const response: DeleteDatabaseResponse = { id: deletedDatabase.id };
  return c.json(response);
});

/**
 * Execute a query on a database (for testing/debugging via API)
 */
databaseRoutes.post(
  "/:databaseIdOrHandle/query",
  apiKeyOrJwtMiddleware,
  zValidator(
    "json",
    z.object({
      sql: z.string().min(1, "SQL query is required"),
      params: z.array(z.unknown()).optional(),
    }) as z.ZodType<DatabaseQueryRequest>
  ),
  async (c) => {
    const databaseIdOrHandle = c.req.param("databaseIdOrHandle");
    const { sql, params } = c.req.valid("json");

    // Get auth context from either JWT or API key
    const { organizationId } = getAuthContext(c);

    // Resolve database via service (verifies ownership)
    const databaseService = new CloudflareDatabaseService(c.env);
    const connection = await databaseService.resolve(
      databaseIdOrHandle,
      organizationId
    );
    if (!connection) {
      return c.json(
        { error: "Database not found or does not belong to your organization" },
        404
      );
    }

    try {
      const result = await connection.query(sql, params);

      const response: DatabaseQueryResponse = result;
      return c.json(response);
    } catch (error) {
      return c.json(
        {
          error: `Failed to execute query: ${error instanceof Error ? error.message : String(error)}`,
        },
        500
      );
    }
  }
);

export default databaseRoutes;
