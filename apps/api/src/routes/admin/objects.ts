import type { ObjectReference } from "@dafthunk/types";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { ApiContext } from "../../context";
import { CloudflareObjectStore } from "../../runtime/cloudflare-object-store";

const adminObjectsRoutes = new Hono<ApiContext>();

/**
 * GET /admin/objects
 *
 * Stream any object regardless of organization. Authorization is enforced
 * by the admin middleware applied at the parent router level. The
 * organizationId query parameter is used as a sanity check against the
 * stored metadata.
 */
adminObjectsRoutes.get(
  "/",
  zValidator(
    "query",
    z.object({
      // Restrict id to safe identifier shape — defends against header
      // injection now that `id` is interpolated into Content-Disposition.
      id: z.string().regex(/^[a-zA-Z0-9_-]+$/),
      mimeType: z.string().min(1),
      organizationId: z.string().min(1),
    })
  ),
  async (c) => {
    const { id, mimeType, organizationId } = c.req.valid("query");

    try {
      const objectStore = new CloudflareObjectStore(c.env.RESSOURCES);
      const reference: ObjectReference = { id, mimeType };
      const result = await objectStore.readObject(reference);

      if (!result) {
        return c.json({ error: "Object not found" }, 404);
      }

      if (result.metadata?.organizationId !== organizationId) {
        return c.json(
          { error: "Object does not belong to the specified organization" },
          404
        );
      }

      // Security: this route serves blobs from any org's R2 bucket on the
      // API origin, which shares the JWT cookie domain with the web origin.
      // Without these headers, a non-admin user could upload HTML to their
      // own org via POST /:orgId/objects (which trusts the multipart
      // file.type), then trick an admin into navigating to
      // /admin/objects?id=...&mimeType=text/html&organizationId=<their-org>.
      // The browser would render the HTML at the API origin with the
      // admin's cookie attached, enabling same-origin calls to /admin/*.
      //
      // `Content-Disposition: attachment` forces top-level navigations to
      // download instead of render (img/audio/video tags ignore it, so
      // legitimate previews in the admin execution viewer still work).
      // `X-Content-Type-Options: nosniff` blocks browser MIME sniffing.
      return new Response(result.data, {
        headers: {
          "content-type": mimeType,
          "Cache-Control": "private, max-age=31536000",
          "Content-Disposition": `attachment; filename="object-${id}"`,
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch (error) {
      console.error("Admin object retrieval error:", error);
      return c.json(
        { error: "Object not found or error retrieving object" },
        404
      );
    }
  }
);

export default adminObjectsRoutes;
