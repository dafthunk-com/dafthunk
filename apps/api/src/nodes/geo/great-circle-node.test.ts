import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { GreatCircleNode } from "./great-circle-node";

describe("GreatCircleNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    mode: "dev" as const,
    inputs,
    getIntegration: async () => {
      throw new Error("No integrations in test");
    },
    env: {} as any,
  });

  const node = new GreatCircleNode({
    id: "test-node",
    name: "Test Node",
    type: "greatCircle",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  describe("Basic functionality", () => {
    it("should return a line when given valid start and end points", async () => {
      const context = createMockContext({
        start: [0, 0],
        end: [1, 1],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.line).toBeDefined();
      expect(result.outputs?.line.type).toBe("Feature");
      expect(["LineString", "MultiLineString"]).toContain(
        result.outputs?.line.geometry.type
      );
    });

    it("should work with Point features", async () => {
      const context = createMockContext({
        start: {
          type: "Feature",
          properties: { name: "Start" },
          geometry: {
            type: "Point",
            coordinates: [0, 0],
          },
        },
        end: {
          type: "Feature",
          properties: { name: "End" },
          geometry: {
            type: "Point",
            coordinates: [1, 1],
          },
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.line).toBeDefined();
      expect(result.outputs?.line.type).toBe("Feature");
    });

    it("should work with properties parameter", async () => {
      const context = createMockContext({
        start: [0, 0],
        end: [1, 1],
        properties: { name: "Test Route", distance: "short" },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.line).toBeDefined();
      expect(result.outputs?.line.properties).toBeDefined();
    });

    it("should work with npoints parameter", async () => {
      const context = createMockContext({
        start: [0, 0],
        end: [1, 1],
        npoints: 50,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.line).toBeDefined();
    });

    it("should work with offset parameter", async () => {
      const context = createMockContext({
        start: [0, 0],
        end: [1, 1],
        offset: 5,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.line).toBeDefined();
    });

    it("should work with all optional parameters", async () => {
      const context = createMockContext({
        start: [0, 0],
        end: [1, 1],
        properties: { name: "Complete Route" },
        npoints: 75,
        offset: 15,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.line).toBeDefined();
    });
  });

  describe("Input validation", () => {
    it("should handle missing start input", async () => {
      const context = createMockContext({
        end: [1, 1],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing start point input");
    });

    it("should handle missing end input", async () => {
      const context = createMockContext({
        start: [0, 0],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing end point input");
    });

    it("should handle null start input", async () => {
      const context = createMockContext({
        start: null,
        end: [1, 1],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing start point input");
    });

    it("should handle null end input", async () => {
      const context = createMockContext({
        start: [0, 0],
        end: null,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing end point input");
    });

    it("should handle invalid properties type (array)", async () => {
      const context = createMockContext({
        start: [0, 0],
        end: [1, 1],
        properties: ["invalid", "array"],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Properties must be an object");
    });

    it("should handle invalid properties type (string)", async () => {
      const context = createMockContext({
        start: [0, 0],
        end: [1, 1],
        properties: "invalid",
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Properties must be an object");
    });

    it("should handle invalid npoints (string)", async () => {
      const context = createMockContext({
        start: [0, 0],
        end: [1, 1],
        npoints: "invalid",
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Npoints must be a positive number");
    });

    it("should handle invalid npoints (NaN)", async () => {
      const context = createMockContext({
        start: [0, 0],
        end: [1, 1],
        npoints: NaN,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Npoints must be a positive number");
    });

    it("should handle invalid npoints (Infinity)", async () => {
      const context = createMockContext({
        start: [0, 0],
        end: [1, 1],
        npoints: Infinity,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Npoints must be a positive number");
    });

    it("should handle invalid npoints (zero)", async () => {
      const context = createMockContext({
        start: [0, 0],
        end: [1, 1],
        npoints: 0,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Npoints must be a positive number");
    });

    it("should handle invalid npoints (negative)", async () => {
      const context = createMockContext({
        start: [0, 0],
        end: [1, 1],
        npoints: -1,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Npoints must be a positive number");
    });

    it("should handle invalid offset (string)", async () => {
      const context = createMockContext({
        start: [0, 0],
        end: [1, 1],
        offset: "invalid",
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Offset must be a valid number");
    });

    it("should handle invalid offset (NaN)", async () => {
      const context = createMockContext({
        start: [0, 0],
        end: [1, 1],
        offset: NaN,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Offset must be a valid number");
    });

    it("should handle invalid offset (Infinity)", async () => {
      const context = createMockContext({
        start: [0, 0],
        end: [1, 1],
        offset: Infinity,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Offset must be a valid number");
    });
  });

  describe("Edge cases", () => {
    it("should handle null properties", async () => {
      const context = createMockContext({
        start: [0, 0],
        end: [1, 1],
        properties: null,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.line).toBeDefined();
    });

    it("should handle null npoints", async () => {
      const context = createMockContext({
        start: [0, 0],
        end: [1, 1],
        npoints: null,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.line).toBeDefined();
    });

    it("should handle null offset", async () => {
      const context = createMockContext({
        start: [0, 0],
        end: [1, 1],
        offset: null,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.line).toBeDefined();
    });

    it("should handle same start and end points", async () => {
      const context = createMockContext({
        start: [0, 0],
        end: [0, 0],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.line).toBeDefined();
    });

    it("should handle large coordinate values", async () => {
      const context = createMockContext({
        start: [180, 90],
        end: [-180, -90],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.line).toBeDefined();
    });

    it("should handle small coordinate values", async () => {
      const context = createMockContext({
        start: [0.001, 0.001],
        end: [0.002, 0.002],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.line).toBeDefined();
    });
  });
});
