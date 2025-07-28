import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { PointToPolygonDistanceNode } from "./point-to-polygon-distance-node";

describe("PointToPolygonDistanceNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    env: {} as any,
  });

  const node = new PointToPolygonDistanceNode({
    id: "test-node",
    name: "Test Node",
    type: "point-to-polygon-distance",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  describe("Basic functionality", () => {
    it("should return a distance when given valid point and polygon", async () => {
      const context = createMockContext({
        point: {
          type: "Feature",
          properties: { name: "Test Point" },
          geometry: {
            type: "Point",
            coordinates: [0, 0],
          },
        },
        polygon: {
          type: "Feature",
          properties: { name: "Test Polygon" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [1, 1],
                [1, -1],
                [-1, -1],
                [-1, 1],
                [1, 1],
              ],
            ],
          },
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.distance).toBeDefined();
      expect(typeof result.outputs?.distance).toBe("number");
    });

    it("should work with simple point and polygon geometry", async () => {
      const context = createMockContext({
        point: {
          type: "Point",
          coordinates: [0, 0],
        },
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [1, 1],
              [1, -1],
              [-1, -1],
              [-1, 1],
              [1, 1],
            ],
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
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [1, 1],
              [1, -1],
              [-1, -1],
              [-1, 1],
              [1, 1],
            ],
          ],
        },
        units: "kilometers",
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
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [1, 1],
              [1, -1],
              [-1, -1],
              [-1, 1],
              [1, 1],
            ],
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
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [1, 1],
              [1, -1],
              [-1, -1],
              [-1, 1],
              [1, 1],
            ],
          ],
        },
        units: "miles",
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
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [1, 1],
              [1, -1],
              [-1, -1],
              [-1, 1],
              [1, 1],
            ],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing point input");
    });

    it("should handle missing polygon input", async () => {
      const context = createMockContext({
        point: {
          type: "Point",
          coordinates: [0, 0],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing polygon input");
    });

    it("should handle null point input", async () => {
      const context = createMockContext({
        point: null,
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [1, 1],
              [1, -1],
              [-1, -1],
              [-1, 1],
              [1, 1],
            ],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing point input");
    });

    it("should handle null polygon input", async () => {
      const context = createMockContext({
        point: {
          type: "Point",
          coordinates: [0, 0],
        },
        polygon: null,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing polygon input");
    });

    it("should handle invalid units type", async () => {
      const context = createMockContext({
        point: {
          type: "Point",
          coordinates: [0, 0],
        },
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [1, 1],
              [1, -1],
              [-1, -1],
              [-1, 1],
              [1, 1],
            ],
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
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [1, 1],
              [1, -1],
              [-1, -1],
              [-1, 1],
              [1, 1],
            ],
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
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [1, 1],
              [1, -1],
              [-1, -1],
              [-1, 1],
              [1, 1],
            ],
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
    it("should handle point inside the polygon", async () => {
      const context = createMockContext({
        point: {
          type: "Point",
          coordinates: [0, 0],
        },
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [1, 1],
              [1, -1],
              [-1, -1],
              [-1, 1],
              [1, 1],
            ],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.distance).toBeDefined();
      expect(typeof result.outputs?.distance).toBe("number");
    });

    it("should handle point on polygon boundary", async () => {
      const context = createMockContext({
        point: {
          type: "Point",
          coordinates: [1, 0],
        },
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [1, 1],
              [1, -1],
              [-1, -1],
              [-1, 1],
              [1, 1],
            ],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.distance).toBeDefined();
      expect(typeof result.outputs?.distance).toBe("number");
    });

    it("should handle point outside the polygon", async () => {
      const context = createMockContext({
        point: {
          type: "Point",
          coordinates: [2, 2],
        },
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [1, 1],
              [1, -1],
              [-1, -1],
              [-1, 1],
              [1, 1],
            ],
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
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [1, 1],
              [1, -1],
              [-1, -1],
              [-1, 1],
              [1, 1],
            ],
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
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [1, 1],
              [1, -1],
              [-1, -1],
              [-1, 1],
              [1, 1],
            ],
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
        polygon: {
          type: "Polygon",
          coordinates: [
            [
              [10, 10],
              [10, -10],
              [-10, -10],
              [-10, 10],
              [10, 10],
            ],
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
