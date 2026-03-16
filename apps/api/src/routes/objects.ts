import type {
  DeleteObjectResponse,
  GetObjectMetadataResponse,
  ListObjectsResponse,
  ObjectMetadata,
  ObjectReference,
  UploadObjectResponse,
} from "@dafthunk/types";
import { Hono } from "hono";

import { apiKeyOrJwtMiddleware, jwtMiddleware } from "../auth";
import type { ApiContext } from "../context";
import { CloudflareObjectStore } from "../runtime/cloudflare-object-store";

const objectRoutes = new Hono<ApiContext>();

// organizationId is guaranteed by jwtMiddleware / apiKeyOrJwtMiddleware,
// so route handlers use c.get("organizationId")! without null checks.

objectRoutes.get("/", apiKeyOrJwtMiddleware, async (c) => {
  const objectId = c.req.query("id");
  const mimeType = c.req.query("mimeType");

  if (!objectId || !mimeType) {
    return c.json(
      { error: "Missing required parameters: id and mimeType" },
      400
    );
  }

  const organizationId = c.get("organizationId")!;

  try {
    const objectStore = new CloudflareObjectStore(c.env.RESSOURCES);
    const reference: ObjectReference = { id: objectId, mimeType };
    const result = await objectStore.readObject(reference);

    if (!result) {
      return c.json({ error: "Object not found" }, 404);
    }

    const { data, metadata } = result;

    if (metadata?.organizationId !== organizationId) {
      return c.json(
        { error: "Forbidden: You do not have access to this object" },
        403
      );
    }

    return new Response(data, {
      headers: {
        "content-type": mimeType,
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (error) {
    console.error("Object retrieval error:", error);
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return c.json({ error: error.message }, 403);
    }
    return c.json(
      { error: "Object not found or error retrieving object" },
      404
    );
  }
});

objectRoutes.post("/", jwtMiddleware, async (c) => {
  const contentType = c.req.header("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return c.json({ error: "Content type must be multipart/form-data" }, 400);
  }

  const body = await c.req.parseBody();
  const file = body.file;

  if (!file || !(file instanceof File)) {
    return c.json({ error: "No file provided or invalid file" }, 400);
  }

  const organizationId = c.get("organizationId")!;

  try {
    const objectStore = new CloudflareObjectStore(c.env.RESSOURCES);
    const buffer = await file.arrayBuffer();
    const data = new Uint8Array(buffer);
    const reference = await objectStore.writeObject(
      data,
      file.type || "application/octet-stream",
      organizationId
    );

    const response: UploadObjectResponse = { reference };
    return c.json(response);
  } catch (error) {
    console.error("Object storage error:", error);
    return c.json({ error: "Error storing object" }, 500);
  }
});

objectRoutes.delete("/:id", jwtMiddleware, async (c) => {
  const objectId = c.req.param("id");
  const mimeType = c.req.query("mimeType");

  if (!objectId || !mimeType) {
    return c.json(
      { error: "Missing required parameters: id and mimeType" },
      400
    );
  }

  const organizationId = c.get("organizationId")!;

  try {
    const objectStore = new CloudflareObjectStore(c.env.RESSOURCES);
    const reference: ObjectReference = { id: objectId, mimeType };

    const result = await objectStore.readObject(reference);

    if (!result) {
      return c.json({ error: "Object not found" }, 404);
    }

    const { metadata } = result;

    if (metadata?.organizationId !== organizationId) {
      return c.json(
        { error: "Forbidden: You do not have access to delete this object" },
        403
      );
    }

    await objectStore.deleteObject(reference);

    const response: DeleteObjectResponse = { success: true };
    return c.json(response);
  } catch (error) {
    console.error("Object deletion error:", error);
    return c.json({ error: "Error deleting object" }, 500);
  }
});

objectRoutes.get("/metadata/:id", jwtMiddleware, async (c) => {
  const objectId = c.req.param("id");
  const mimeType = c.req.query("mimeType");

  if (!objectId || !mimeType) {
    return c.json(
      { error: "Missing required parameters: id and mimeType" },
      400
    );
  }

  const organizationId = c.get("organizationId")!;

  try {
    const objectStore = new CloudflareObjectStore(c.env.RESSOURCES);
    const reference: ObjectReference = { id: objectId, mimeType };

    const result = await objectStore.readObject(reference);

    if (!result) {
      return c.json({ error: "Object not found" }, 404);
    }

    const { metadata } = result;

    if (metadata?.organizationId !== organizationId) {
      return c.json(
        {
          error: "Forbidden: You do not have access to this object's metadata",
        },
        403
      );
    }

    const objectMetadata: ObjectMetadata = {
      id: objectId,
      mimeType,
      size: result.data.length,
      createdAt: metadata?.createdAt
        ? new Date(metadata.createdAt)
        : new Date(),
      organizationId: metadata?.organizationId || "",
      executionId: metadata?.executionId,
    };

    const response: GetObjectMetadataResponse = { metadata: objectMetadata };
    return c.json(response);
  } catch (error) {
    console.error("Object metadata retrieval error:", error);
    return c.json({ error: "Error retrieving object metadata" }, 500);
  }
});

objectRoutes.get("/list", jwtMiddleware, async (c) => {
  const organizationId = c.get("organizationId")!;

  try {
    const objectStore = new CloudflareObjectStore(c.env.RESSOURCES);
    const objectList = await objectStore.listObjects(organizationId);

    const response: ListObjectsResponse = { objects: objectList };
    return c.json(response);
  } catch (error) {
    console.error("Object listing error:", error);
    return c.json({ error: "Error listing objects" }, 500);
  }
});

export default objectRoutes;
