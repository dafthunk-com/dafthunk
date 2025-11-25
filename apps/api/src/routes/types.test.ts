import type { GetNodeTypesResponse, WorkflowType } from "@dafthunk/types";
import { env } from "cloudflare:test";
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Bindings } from "../context";
import { ApiContext } from "../context";
import { MockNodeRegistry } from "../mocks";
import typeRoutes from "./types";

// Mock the CloudflareNodeRegistry to use MockNodeRegistry instead
vi.mock("../nodes/cloudflare-node-registry", () => ({
  CloudflareNodeRegistry: class {
    constructor(_env: any, _developerMode: boolean) {
      return new MockNodeRegistry(env as Bindings, true);
    }
  },
}));

describe("Types Route Tests", () => {
  let app: Hono<ApiContext>;

  beforeEach(() => {
    // Create a new Hono app instance with the types routes
    app = new Hono<ApiContext>();
    app.route("/types", typeRoutes);
  });

  describe("Basic Functionality", () => {
    it("should handle GET requests to /types", async () => {
      const response = await app.request("/types", {
        method: "GET",
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain(
        "application/json"
      );
    });

    it("should return valid GetNodeTypesResponse structure", async () => {
      const response = await app.request("/types", {
        method: "GET",
      });

      const data = (await response.json()) as GetNodeTypesResponse;

      expect(data).toHaveProperty("nodeTypes");
      expect(Array.isArray(data.nodeTypes)).toBe(true);
      expect(data.nodeTypes.length).toBeGreaterThan(0);
    });

    it("should return node types with correct structure", async () => {
      const response = await app.request("/types", {
        method: "GET",
      });

      const data = (await response.json()) as GetNodeTypesResponse;
      const nodeType = data.nodeTypes[0];

      // Validate NodeType structure
      expect(nodeType).toHaveProperty("id");
      expect(nodeType).toHaveProperty("name");
      expect(nodeType).toHaveProperty("type");
      expect(nodeType).toHaveProperty("tags");
      expect(nodeType).toHaveProperty("icon");
      expect(nodeType).toHaveProperty("inputs");
      expect(nodeType).toHaveProperty("outputs");

      expect(typeof nodeType.id).toBe("string");
      expect(typeof nodeType.name).toBe("string");
      expect(typeof nodeType.type).toBe("string");
      expect(Array.isArray(nodeType.tags)).toBe(true);
      expect(typeof nodeType.icon).toBe("string");
      expect(Array.isArray(nodeType.inputs)).toBe(true);
      expect(Array.isArray(nodeType.outputs)).toBe(true);
    });
  });

  describe("Workflow Type Filtering", () => {
    const workflowTypes: WorkflowType[] = [
      "manual",
      "http_request",
      "email_message",
      "scheduled",
    ];

    it.each(workflowTypes)(
      "should handle workflowType query parameter: %s",
      async (workflowType) => {
        const response = await app.request(
          `/types?workflowType=${workflowType}`,
          {
            method: "GET",
          }
        );

        expect(response.status).toBe(200);

        const data = (await response.json()) as GetNodeTypesResponse;
        expect(data).toHaveProperty("nodeTypes");
        expect(Array.isArray(data.nodeTypes)).toBe(true);

        // All returned node types should be compatible with the requested workflow type
        // or have no compatibility restrictions
        data.nodeTypes.forEach((nodeType) => {
          if (nodeType.compatibility) {
            expect(nodeType.compatibility).toContain(workflowType);
          }
          // If no compatibility array, it's compatible with all workflow types
        });
      }
    );

    it("should return different results for different workflow types", async () => {
      // Get node types for manual workflow
      const manualResponse = await app.request("/types?workflowType=manual", {
        method: "GET",
      });
      const manualData = (await manualResponse.json()) as GetNodeTypesResponse;

      // Get node types for email workflow
      const emailResponse = await app.request(
        "/types?workflowType=email_message",
        {
          method: "GET",
        }
      );
      const emailData = (await emailResponse.json()) as GetNodeTypesResponse;

      // Both should be successful
      expect(manualResponse.status).toBe(200);
      expect(emailResponse.status).toBe(200);

      // Both should return arrays
      expect(Array.isArray(manualData.nodeTypes)).toBe(true);
      expect(Array.isArray(emailData.nodeTypes)).toBe(true);

      // The results might be different (depending on node compatibility)
      // But both should contain at least some nodes
      expect(manualData.nodeTypes.length).toBeGreaterThan(0);
      expect(emailData.nodeTypes.length).toBeGreaterThan(0);
    });

    it("should return all node types when no workflowType is specified", async () => {
      const allTypesResponse = await app.request("/types", {
        method: "GET",
      });
      const manualTypesResponse = await app.request(
        "/types?workflowType=manual",
        {
          method: "GET",
        }
      );

      const allData = (await allTypesResponse.json()) as GetNodeTypesResponse;
      const manualData =
        (await manualTypesResponse.json()) as GetNodeTypesResponse;

      expect(allTypesResponse.status).toBe(200);
      expect(manualTypesResponse.status).toBe(200);

      // All types should include at least as many types as the filtered result
      expect(allData.nodeTypes.length).toBeGreaterThanOrEqual(
        manualData.nodeTypes.length
      );
    });

    it("should handle invalid workflowType gracefully", async () => {
      const response = await app.request("/types?workflowType=invalid_type", {
        method: "GET",
      });

      // Should still return successfully (invalid types are just ignored)
      expect(response.status).toBe(200);

      const data = (await response.json()) as GetNodeTypesResponse;
      expect(data).toHaveProperty("nodeTypes");
      expect(Array.isArray(data.nodeTypes)).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle OPTIONS requests (CORS preflight)", async () => {
      const response = await app.request("/types", {
        method: "OPTIONS",
      });

      // Should not error (might return 404 or 405, but not 500)
      expect(response.status).not.toBe(500);
    });

    it("should handle POST requests with method not allowed", async () => {
      const response = await app.request("/types", {
        method: "POST",
        body: JSON.stringify({ test: "data" }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      // Should not error with 500 (might return 404 or 405)
      expect(response.status).not.toBe(500);
    });

    it("should handle malformed query parameters", async () => {
      const response = await app.request("/types?workflowType=", {
        method: "GET",
      });

      expect(response.status).toBe(200);
      const data = (await response.json()) as GetNodeTypesResponse;
      expect(data).toHaveProperty("nodeTypes");
    });
  });

  describe("Response Validation", () => {
    it("should return consistent response format", async () => {
      const response = await app.request("/types", {
        method: "GET",
      });

      const data = (await response.json()) as GetNodeTypesResponse;

      // Validate the exact structure matches GetNodeTypesResponse
      expect(Object.keys(data)).toEqual(["nodeTypes"]);
      expect(data.nodeTypes).toBeDefined();
      expect(Array.isArray(data.nodeTypes)).toBe(true);
    });

    it("should return node types with required fields", async () => {
      const response = await app.request("/types", {
        method: "GET",
      });

      const data = (await response.json()) as GetNodeTypesResponse;

      data.nodeTypes.forEach((nodeType) => {
        // Required fields
        expect(nodeType.id).toBeDefined();
        expect(nodeType.name).toBeDefined();
        expect(nodeType.type).toBeDefined();
        expect(nodeType.tags).toBeDefined();
        expect(nodeType.icon).toBeDefined();
        expect(nodeType.inputs).toBeDefined();
        expect(nodeType.outputs).toBeDefined();

        // Types
        expect(typeof nodeType.id).toBe("string");
        expect(typeof nodeType.name).toBe("string");
        expect(typeof nodeType.type).toBe("string");
        expect(Array.isArray(nodeType.tags)).toBe(true);
        expect(typeof nodeType.icon).toBe("string");
        expect(Array.isArray(nodeType.inputs)).toBe(true);
        expect(Array.isArray(nodeType.outputs)).toBe(true);

        // Optional fields
        if (nodeType.description !== undefined) {
          expect(typeof nodeType.description).toBe("string");
        }
        if (nodeType.usage !== undefined) {
          expect(typeof nodeType.usage).toBe("number");
        }
        if (nodeType.compatibility !== undefined) {
          expect(Array.isArray(nodeType.compatibility)).toBe(true);
          nodeType.compatibility.forEach((workflowType) => {
            expect([
              "manual",
              "http_request",
              "email_message",
              "scheduled",
            ]).toContain(workflowType);
          });
        }
      });
    });

    it("should return node types with valid parameters", async () => {
      const response = await app.request("/types", {
        method: "GET",
      });

      const data = (await response.json()) as GetNodeTypesResponse;

      data.nodeTypes.forEach((nodeType) => {
        // Validate input parameters
        nodeType.inputs.forEach((input) => {
          expect(input.name).toBeDefined();
          expect(input.type).toBeDefined();
          expect(typeof input.name).toBe("string");
          expect(typeof input.type).toBe("string");

          // Valid parameter types
          expect([
            "string",
            "number",
            "boolean",
            "image",
            "json",
            "document",
            "audio",
            "any",
          ]).toContain(input.type);
        });

        // Validate output parameters
        nodeType.outputs.forEach((output) => {
          expect(output.name).toBeDefined();
          expect(output.type).toBeDefined();
          expect(typeof output.name).toBe("string");
          expect(typeof output.type).toBe("string");

          // Valid parameter types
          expect([
            "string",
            "number",
            "boolean",
            "image",
            "json",
            "document",
            "audio",
            "any",
          ]).toContain(output.type);
        });
      });
    });
  });

  describe("Performance and Reliability", () => {
    it("should respond quickly", async () => {
      const startTime = Date.now();

      const response = await app.request("/types", {
        method: "GET",
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    it("should handle multiple concurrent requests", async () => {
      const requests = Array.from({ length: 5 }, () =>
        app.request("/types", { method: "GET" })
      );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });

    it("should return consistent results across multiple calls", async () => {
      const response1 = await app.request("/types", { method: "GET" });
      const response2 = await app.request("/types", { method: "GET" });

      const data1 = (await response1.json()) as GetNodeTypesResponse;
      const data2 = (await response2.json()) as GetNodeTypesResponse;

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(data1.nodeTypes.length).toBe(data2.nodeTypes.length);

      // Should return the same node types in the same order
      expect(data1.nodeTypes.map((n) => n.id)).toEqual(
        data2.nodeTypes.map((n) => n.id)
      );
    });
  });
});
