import { Hono } from "hono";
import { ObjectStore } from "../runtime/objectStore";
import { ObjectReference } from "@dafthunk/types";
import { ApiContext } from "../context";
import { createDatabase } from "../db";
import { executions as executionsTable } from "../db/schema";
import { eq } from "drizzle-orm";

const publicObjectRoutes = new Hono<ApiContext>();

publicObjectRoutes.get("/", async (c) => {
  const objectId = c.req.query("id");
  const mimeType = c.req.query("mimeType");

  if (!objectId || !mimeType) {
    return c.text("Missing required parameters: id and mimeType", 400);
  }

  try {
    const objectStore = new ObjectStore(c.env.BUCKET);
    const reference: ObjectReference = { id: objectId, mimeType };
    const result = await objectStore.readObject(reference);

    if (!result) {
      return c.text("Object not found", 404);
    }

    const { data, metadata } = result;

    if (!metadata?.executionId) {
      return c.text("Object is not linked to an execution", 404);
    }

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

    if (execution.visibility !== "public") {
      return c.text(
        "Forbidden: You do not have access to this object via its execution",
        403
      );
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

export default publicObjectRoutes;
