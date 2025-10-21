import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { DestinationNode } from "./destination-node";

describe("DestinationNode", () => {
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

  const node = new DestinationNode({
    id: "test-node",
    name: "Test Node",
    type: "destination",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  describe("Input validation", () => {
    it("should handle missing origin input", async () => {
      const context = createMockContext({
        distance: 1,
        bearing: 0,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing origin point input");
    });

    it("should handle missing distance input", async () => {
      const context = createMockContext({
        origin: {
          type: "Point",
          coordinates: [-122.4194, 37.7749],
        },
        bearing: 0,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing distance input");
    });

    it("should handle missing bearing input", async () => {
      const context = createMockContext({
        origin: {
          type: "Point",
          coordinates: [-122.4194, 37.7749],
        },
        distance: 1,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing bearing input");
    });
  });

  describe("Successful execution", () => {
    it("should return a destination point with basic inputs", async () => {
      const context = createMockContext({
        origin: {
          type: "Point",
          coordinates: [-122.4194, 37.7749],
        },
        distance: 1,
        bearing: 0,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.destination).toBeDefined();
      expect(result.outputs?.destination.type).toBe("Feature");
      expect(result.outputs?.destination.geometry.type).toBe("Point");
      expect(
        Array.isArray(result.outputs?.destination.geometry.coordinates)
      ).toBe(true);
      expect(result.outputs?.destination.geometry.coordinates).toHaveLength(2);
    });

    it("should work with Point Feature as origin", async () => {
      const context = createMockContext({
        origin: {
          type: "Feature",
          properties: { name: "Start Point" },
          geometry: {
            type: "Point",
            coordinates: [-122.4194, 37.7749],
          },
        },
        distance: 1,
        bearing: 45,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.destination).toBeDefined();
      expect(result.outputs?.destination.geometry.type).toBe("Point");
    });

    it("should work with custom units", async () => {
      const context = createMockContext({
        origin: {
          type: "Point",
          coordinates: [-122.4194, 37.7749],
        },
        distance: 1,
        bearing: 0,
        units: "miles",
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.destination).toBeDefined();
      expect(result.outputs?.destination.geometry.type).toBe("Point");
    });

    it("should work with custom properties", async () => {
      const context = createMockContext({
        origin: {
          type: "Point",
          coordinates: [-122.4194, 37.7749],
        },
        distance: 1,
        bearing: 0,
        properties: {
          name: "Destination Point",
          type: "calculated",
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.destination).toBeDefined();
      expect(result.outputs?.destination.geometry.type).toBe("Point");
      expect(result.outputs?.destination.properties).toBeDefined();
    });

    it("should work with zero distance", async () => {
      const context = createMockContext({
        origin: {
          type: "Point",
          coordinates: [-122.4194, 37.7749],
        },
        distance: 0,
        bearing: 90,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.destination).toBeDefined();
      expect(result.outputs?.destination.geometry.type).toBe("Point");
    });

    it("should work with negative bearing", async () => {
      const context = createMockContext({
        origin: {
          type: "Point",
          coordinates: [-122.4194, 37.7749],
        },
        distance: 1,
        bearing: -45,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.destination).toBeDefined();
      expect(result.outputs?.destination.geometry.type).toBe("Point");
    });

    it("should work with extreme bearing values", async () => {
      const context = createMockContext({
        origin: {
          type: "Point",
          coordinates: [-122.4194, 37.7749],
        },
        distance: 1,
        bearing: 180,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.destination).toBeDefined();
      expect(result.outputs?.destination.geometry.type).toBe("Point");
    });
  });
});
