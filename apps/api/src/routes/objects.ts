import { Hono } from "hono";
import { ObjectStore } from "../runtime/objectStore";
import { ObjectReference } from "@dafthunk/types";
import { ApiContext, CustomJWTPayload } from "../context";
import { jwtAuth } from "../auth";
import { createDatabase } from "../db";
import { executions as executionsTable } from "../db/schema";
import { eq } from "drizzle-orm";

const objects = new Hono<ApiContext>();

objects.get("/", jwtAuth, async (c) => {
  const url = new URL(c.req.url);
  const objectId = url.searchParams.get("id");
  const mimeType = url.searchParams.get("mimeType");

  if (!objectId || !mimeType) {
    return c.text("Missing required parameters: id and mimeType", 400);
  }

  const authPayload = c.get("jwtPayload") as CustomJWTPayload;
  if (!authPayload || !authPayload.organizationId) {
    console.error("Organization ID not found in auth context for GET /objects");
    return c.text("Unauthorized: Organization ID is missing", 401);
  }
  const userOrganizationId = authPayload.organizationId;

  try {
    const objectStore = new ObjectStore(c.env.BUCKET);
    const reference: ObjectReference = { id: objectId, mimeType };
    const result = await objectStore.readObject(reference);

    if (!result) {
      return c.text("Object not found", 404);
    }

    const { data, metadata } = result;

    if (metadata?.executionId) {
      const db = createDatabase(c.env.DB);
      const [execution] = await db
        .select({
          visibility: executionsTable.visibility,
          organizationId: executionsTable.organizationId,
        })
        .from(executionsTable)
        .where(eq(executionsTable.id, metadata.executionId));

      if (!execution) {
        return c.text("Object not found or linked to invalid execution", 404);
      }

      if (execution.visibility === "private") {
        if (execution.organizationId !== userOrganizationId) {
          return c.text(
            "Forbidden: You do not have access to this object via its execution",
            403
          );
        }
      }
    } else {
      if (metadata?.organizationId !== userOrganizationId) {
        return c.text("Forbidden: You do not have access to this object", 403);
      }
    }

    return c.body(data, {
      headers: {
        "content-type": mimeType,
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (error) {
    console.error("Object retrieval error:", error);
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return c.text(error.message, 403);
    }
    return c.text("Object not found or error retrieving object", 404);
  }
});

objects.post("/", jwtAuth, async (c) => {
  const contentType = c.req.header("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return c.text("Content type must be multipart/form-data", 400);
  }

  const body = await c.req.parseBody();
  const file = body.file;

  if (!file || !(file instanceof File)) {
    return c.text("No file provided or invalid file", 400);
  }

  const authPayload = c.get("jwtPayload") as CustomJWTPayload;
  if (!authPayload || !authPayload.organizationId) {
    console.error("Organization ID not found in auth context");
    return c.text("Unauthorized: Organization ID is missing", 401);
  }
  const organizationId = authPayload.organizationId;

  try {
    const objectStore = new ObjectStore(c.env.BUCKET);
    const buffer = await file.arrayBuffer();
    const data = new Uint8Array(buffer);
    const reference = await objectStore.writeObject(
      data,
      file.type || "application/octet-stream",
      organizationId
    );

    return c.json({ reference });
  } catch (error) {
    console.error("Object storage error:", error);
    return c.text("Error storing object", 500);
  }
});

export default objects;
