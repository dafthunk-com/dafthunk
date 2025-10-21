import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { PointToLineDistanceNode } from "./point-to-line-distance-node";

describe("PointToLineDistanceNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    getIntegration: async () => {
      throw new Error("No integrations in test");
    },
    env: {} as any,
  });

  const node = new PointToLineDistanceNode({
    id: "test-node",
    name: "Test Node",
    type: "point-to-line-distance",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  describe("Basic functionality", () => {
    it("should return a distance when given valid point and line", async () => {
      const context = createMockContext({
        point: {
          type: "Feature",
          properties: { name: "Test Point" },
          geometry: {
            type: "Point",
            coordinates: [0, 0],
          },
        },
        line: {
          type: "Feature",
          properties: { name: "Test Line" },
          geometry: {
            type: "LineString",
            coordinates: [
              [1, 1],
              [-1, 1],
            ],
          },
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.distance).toBeDefined();
      expect(typeof result.outputs?.distance).toBe("number");
    });

    it("should work with simple point and line geometry", async () => {
      const context = createMockContext({
        point: {
          type: "Point",
          coordinates: [0, 0],
        },
        line: {
          type: "LineString",
          coordinates: [
            [1, 1],
            [-1, 1],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.distance).toBeDefined();
      expect(typeof result.outputs?.distance).toBe("number");
    });

    it("should work with units parameter", async () => {
      const context = createMockContext({
        point: {
          type: "Point",
          coordinates: [0, 0],
        },
        line: {
          type: "LineString",
          coordinates: [
            [1, 1],
            [-1, 1],
          ],
        },
        units: "miles",
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.distance).toBeDefined();
      expect(typeof result.outputs?.distance).toBe("number");
    });

    it("should work with method parameter", async () => {
      const context = createMockContext({
        point: {
          type: "Point",
          coordinates: [0, 0],
        },
        line: {
          type: "LineString",
          coordinates: [
            [1, 1],
            [-1, 1],
          ],
        },
        method: "planar",
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.distance).toBeDefined();
      expect(typeof result.outputs?.distance).toBe("number");
    });

    it("should work with both units and method parameters", async () => {
      const context = createMockContext({
        point: {
          type: "Point",
          coordinates: [0, 0],
        },
        line: {
          type: "LineString",
          coordinates: [
            [1, 1],
            [-1, 1],
          ],
        },
        units: "kilometers",
        method: "geodesic",
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.distance).toBeDefined();
      expect(typeof result.outputs?.distance).toBe("number");
    });
  });

  describe("Input validation", () => {
    it("should handle missing point input", async () => {
      const context = createMockContext({
        line: {
          type: "LineString",
          coordinates: [
            [1, 1],
            [-1, 1],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing point input");
    });

    it("should handle missing line input", async () => {
      const context = createMockContext({
        point: {
          type: "Point",
          coordinates: [0, 0],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing line input");
    });

    it("should handle null point input", async () => {
      const context = createMockContext({
        point: null,
        line: {
          type: "LineString",
          coordinates: [
            [1, 1],
            [-1, 1],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing point input");
    });

    it("should handle null line input", async () => {
      const context = createMockContext({
        point: {
          type: "Point",
          coordinates: [0, 0],
        },
        line: null,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing line input");
    });

    it("should handle invalid units type", async () => {
      const context = createMockContext({
        point: {
          type: "Point",
          coordinates: [0, 0],
        },
        line: {
          type: "LineString",
          coordinates: [
            [1, 1],
            [-1, 1],
          ],
        },
        units: 123,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Units must be a string");
    });

    it("should handle invalid method type", async () => {
      const context = createMockContext({
        point: {
          type: "Point",
          coordinates: [0, 0],
        },
        line: {
          type: "LineString",
          coordinates: [
            [1, 1],
            [-1, 1],
          ],
        },
        method: 123,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Method must be a string");
    });

    it("should handle invalid method value", async () => {
      const context = createMockContext({
        point: {
          type: "Point",
          coordinates: [0, 0],
        },
        line: {
          type: "LineString",
          coordinates: [
            [1, 1],
            [-1, 1],
          ],
        },
        method: "invalid",
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Method must be 'geodesic' or 'planar'");
    });
  });

  describe("Edge cases", () => {
    it("should handle point on the line", async () => {
      const context = createMockContext({
        point: {
          type: "Point",
          coordinates: [0, 1],
        },
        line: {
          type: "LineString",
          coordinates: [
            [1, 1],
            [-1, 1],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.distance).toBeDefined();
      expect(typeof result.outputs?.distance).toBe("number");
    });

    it("should handle point at line endpoint", async () => {
      const context = createMockContext({
        point: {
          type: "Point",
          coordinates: [1, 1],
        },
        line: {
          type: "LineString",
          coordinates: [
            [1, 1],
            [-1, 1],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.distance).toBeDefined();
      expect(typeof result.outputs?.distance).toBe("number");
    });

    it("should handle null units", async () => {
      const context = createMockContext({
        point: {
          type: "Point",
          coordinates: [0, 0],
        },
        line: {
          type: "LineString",
          coordinates: [
            [1, 1],
            [-1, 1],
          ],
        },
        units: null,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.distance).toBeDefined();
      expect(typeof result.outputs?.distance).toBe("number");
    });

    it("should handle null method", async () => {
      const context = createMockContext({
        point: {
          type: "Point",
          coordinates: [0, 0],
        },
        line: {
          type: "LineString",
          coordinates: [
            [1, 1],
            [-1, 1],
          ],
        },
        method: null,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.distance).toBeDefined();
      expect(typeof result.outputs?.distance).toBe("number");
    });

    it("should handle integer coordinates", async () => {
      const context = createMockContext({
        point: {
          type: "Point",
          coordinates: [0, 0],
        },
        line: {
          type: "LineString",
          coordinates: [
            [10, 10],
            [-10, 10],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.distance).toBeDefined();
      expect(typeof result.outputs?.distance).toBe("number");
    });
  });
});
