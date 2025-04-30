import { Hono } from "hono";
import { ObjectStore } from "../runtime/objectStore";
import { ObjectReference } from "@dafthunk/types";
import { ApiContext } from "../context";
import { jwtAuth } from "./auth";

const objects = new Hono<ApiContext>();

objects.get("/", jwtAuth, async (c) => {
  const url = new URL(c.req.url);
  const objectId = url.searchParams.get("id");
  const mimeType = url.searchParams.get("mimeType");

  if (!objectId || !mimeType) {
    return c.text("Missing required parameters: id and mimeType", 400);
  }

  try {
    const objectStore = new ObjectStore(c.env.BUCKET);
    const reference: ObjectReference = { id: objectId, mimeType };
    const data = await objectStore.readObject(reference);

    return c.body(data, {
      headers: {
        "content-type": mimeType,
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (error) {
    console.error("Object retrieval error:", error);
    return c.text("Object not found", 404);
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

  try {
    const objectStore = new ObjectStore(c.env.BUCKET);
    const buffer = await file.arrayBuffer();
    const data = new Uint8Array(buffer);
    const reference = await objectStore.writeObject(
      data,
      file.type || "application/octet-stream"
    );

    return c.json({ reference });
  } catch (error) {
    console.error("Object storage error:", error);
    return c.text("Error storing object", 500);
  }
});

export default objects;
