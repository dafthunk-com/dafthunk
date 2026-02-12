import { describe, expect, it } from "vitest";

import { NodeContext } from "@dafthunk/runtime";
import { RhumbDestinationNode } from "./rhumb-destination-node";

describe("RhumbDestinationNode", () => {
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

  const node = new RhumbDestinationNode({
    id: "test-node",
    name: "Test Node",
    type: "rhumbDestination",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  describe("Basic functionality", () => {
    it("should execute successfully with basic inputs", async () => {
      const context = createMockContext({
        origin: {
          type: "Point",
          coordinates: [0, 0],
        },
        distance: 10,
        bearing: 0,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.destination).toBeDefined();
    });

    it("should work with Point Feature as origin", async () => {
      const context = createMockContext({
        origin: {
          type: "Feature",
          properties: { name: "Origin Point" },
          geometry: {
            type: "Point",
            coordinates: [0, 0],
          },
        },
        distance: 10,
        bearing: 45,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.destination).toBeDefined();
    });

    it("should handle optional units parameter", async () => {
      const context = createMockContext({
        origin: {
          type: "Point",
          coordinates: [0, 0],
        },
        distance: 10,
        bearing: 0,
        units: "miles",
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.destination).toBeDefined();
    });

    it("should handle optional properties parameter", async () => {
      const context = createMockContext({
        origin: {
          type: "Point",
          coordinates: [0, 0],
        },
        distance: 10,
        bearing: 0,
        properties: {
          name: "Destination Point",
          type: "waypoint",
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.destination).toBeDefined();
    });
  });

  describe("Input validation", () => {
    it("should handle missing origin point input", async () => {
      const context = createMockContext({
        distance: 10,
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
          coordinates: [0, 0],
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
          coordinates: [0, 0],
        },
        distance: 10,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing bearing input");
    });

    it("should handle null inputs", async () => {
      const context = createMockContext({
        origin: null,
        distance: 10,
        bearing: 0,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing origin point input");
    });
  });

  describe("Edge cases", () => {
    it("should handle zero distance", async () => {
      const context = createMockContext({
        origin: {
          type: "Point",
          coordinates: [0, 0],
        },
        distance: 0,
        bearing: 90,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.destination).toBeDefined();
    });

    it("should handle negative distance", async () => {
      const context = createMockContext({
        origin: {
          type: "Point",
          coordinates: [0, 0],
        },
        distance: -10,
        bearing: 0,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.destination).toBeDefined();
    });

    it("should handle negative bearing", async () => {
      const context = createMockContext({
        origin: {
          type: "Point",
          coordinates: [0, 0],
        },
        distance: 10,
        bearing: -90,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.destination).toBeDefined();
    });

    it("should handle large bearing values", async () => {
      const context = createMockContext({
        origin: {
          type: "Point",
          coordinates: [0, 0],
        },
        distance: 10,
        bearing: 450,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.destination).toBeDefined();
    });

    it("should handle null properties", async () => {
      const context = createMockContext({
        origin: {
          type: "Point",
          coordinates: [0, 0],
        },
        distance: 10,
        bearing: 0,
        properties: null,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.destination).toBeDefined();
    });
  });
});
