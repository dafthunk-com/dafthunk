/// <reference types="@cloudflare/workers-types" />

import { Env } from "../src/lib/server/api/env";
import { ObjectReference } from "../src/lib/server/runtime/store";
import { withAuth } from "./auth/middleware";
import { v4 as uuidv4 } from "uuid";

// CORS headers for all responses
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// In-memory storage for development (will be cleared on function restart)
const IN_MEMORY_OBJECTS = new Map<
  string,
  { data: Uint8Array; mimeType: string }
>();

/**
 * Handles object operations:
 * - POST: Upload object and get reference
 * - GET: Retrieve object by reference ID
 */
export const onRequest = withAuth<Env>(async (request, env, user) => {
  // Handle different HTTP methods
  if (request.method === "POST") {
    // Handle file upload
    try {
      // Check if it's a multipart form-data request
      const contentType = request.headers.get("content-type") || "";
      if (!contentType.includes("multipart/form-data")) {
        return new Response("Content type must be multipart/form-data", {
          status: 400,
          headers: CORS_HEADERS,
        });
      }

      // Get form data
      const formData = await request.formData();
      const file = formData.get("file");

      if (!file || !(file instanceof File)) {
        return new Response("No file provided or invalid file", {
          status: 400,
          headers: CORS_HEADERS,
        });
      }

      // Get file info
      const mimeType = file.type || "application/octet-stream";
      const buffer = await file.arrayBuffer();
      const data = new Uint8Array(buffer);

      // Generate a unique ID for the object
      const id = uuidv4();

      // Try to use R2 if available, otherwise use in-memory storage
      if (env.BUCKET) {
        try {
          // Store in R2
          console.log(`Storing object ${id} in R2 (${data.byteLength} bytes)`);
          await env.BUCKET.put(`objects/${id}`, data, {
            httpMetadata: {
              contentType: mimeType,
              cacheControl: "public, max-age=31536000",
            },
          });
          console.log(`Successfully stored object ${id} in R2`);
        } catch (error) {
          console.error("R2 storage error:", error);
          // Fall back to in-memory storage
          IN_MEMORY_OBJECTS.set(id, { data, mimeType });
          console.log(
            `Stored object ${id} in memory fallback (${data.byteLength} bytes)`
          );
        }
      } else {
        // Use in-memory storage
        IN_MEMORY_OBJECTS.set(id, { data, mimeType });
        console.log(`Stored object ${id} in memory (${data.byteLength} bytes)`);
      }

      // Create the reference
      const reference: ObjectReference = {
        id,
        mimeType,
      };

      // Return the reference
      return new Response(JSON.stringify({ reference }), {
        headers: {
          "content-type": "application/json",
          ...CORS_HEADERS,
        },
      });
    } catch (error) {
      console.error("Error uploading object:", error);

      return new Response(
        JSON.stringify({
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        }),
        {
          status: 500,
          headers: {
            "content-type": "application/json",
            ...CORS_HEADERS,
          },
        }
      );
    }
  } else if (request.method === "GET") {
    // Handle object retrieval
    try {
      const url = new URL(request.url);
      const objectId = url.searchParams.get("id");
      const mimeType = url.searchParams.get("mimeType");

      if (!objectId || !mimeType) {
        return new Response("Missing required parameters: id and mimeType", {
          status: 400,
          headers: CORS_HEADERS,
        });
      }

      let data: Uint8Array | null = null;

      // Try to get from R2 if available
      if (env.BUCKET) {
        try {
          const object = await env.BUCKET.get(`objects/${objectId}`);
          if (object) {
            const arrayBuffer = await object.arrayBuffer();
            data = new Uint8Array(arrayBuffer);
          }
        } catch (error) {
          console.error("R2 retrieval error:", error);
        }
      }

      // If not found in R2 or R2 isn't available, try in-memory storage
      if (!data) {
        const memoryObject = IN_MEMORY_OBJECTS.get(objectId);
        if (memoryObject) {
          data = memoryObject.data;
          console.log(
            `Retrieved object ${objectId} from memory (${data.byteLength} bytes)`
          );
        }
      }

      if (!data) {
        return new Response(`Object not found: ${objectId}`, {
          status: 404,
          headers: CORS_HEADERS,
        });
      }

      // Return the binary data with the correct content type
      return new Response(data, {
        headers: {
          "content-type": mimeType,
          "Cache-Control": "public, max-age=31536000",
          ...CORS_HEADERS,
        },
      });
    } catch (error) {
      console.error("Error retrieving object:", error);

      return new Response(
        JSON.stringify({
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        }),
        {
          status:
            error instanceof Error && error.message.includes("not found")
              ? 404
              : 500,
          headers: {
            "content-type": "application/json",
            ...CORS_HEADERS,
          },
        }
      );
    }
  } else {
    // Handle OPTIONS for CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: CORS_HEADERS,
      });
    }

    return new Response("Method not allowed", {
      status: 405,
      headers: CORS_HEADERS,
    });
  }
});
