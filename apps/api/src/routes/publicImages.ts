import { Hono } from "hono";

import { ApiContext } from "../context";

const publicImageRoutes = new Hono<ApiContext>();

publicImageRoutes.get("/:key", async (c) => {
  const key = c.req.param("key");

  try {
    const object = await c.env.BUCKET.get("images/" + key);
    const mimeType = object?.httpMetadata?.contentType;

    if (!object || !mimeType) {
      return c.text("Image not found", 404);
    }

    const image = new Uint8Array(await object.arrayBuffer());

    return c.body(image, {
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

export default publicImageRoutes;
