import { NodeContext } from "@dafthunk/runtime";
import { describe, expect, it } from "vitest";
import { RhumbBearingNode } from "./rhumb-bearing-node";

describe("RhumbBearingNode", () => {
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

  const node = new RhumbBearingNode({
    id: "test-node",
    name: "Test Node",
    type: "rhumbBearing",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  describe("Basic functionality", () => {
    it("should calculate bearing between two points", async () => {
      const context = createMockContext({
        start: {
          type: "Point",
          coordinates: [0, 0],
        },
        end: {
          type: "Point",
          coordinates: [1, 1],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.bearing).toBeDefined();
      expect(typeof result.outputs?.bearing).toBe("number");
    });

    it("should work with Point Features", async () => {
      const context = createMockContext({
        start: {
          type: "Feature",
          properties: { name: "Start Point" },
          geometry: {
            type: "Point",
            coordinates: [0, 0],
          },
        },
        end: {
          type: "Feature",
          properties: { name: "End Point" },
          geometry: {
            type: "Point",
            coordinates: [1, 1],
          },
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.bearing).toBeDefined();
      expect(typeof result.outputs?.bearing).toBe("number");
    });
  });

  describe("Final bearing option", () => {
    it("should calculate initial bearing by default", async () => {
      const context = createMockContext({
        start: {
          type: "Point",
          coordinates: [0, 0],
        },
        end: {
          type: "Point",
          coordinates: [1, 1],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.bearing).toBeDefined();
    });

    it("should calculate final bearing when requested", async () => {
      const context = createMockContext({
        start: {
          type: "Point",
          coordinates: [0, 0],
        },
        end: {
          type: "Point",
          coordinates: [1, 1],
        },
        final: true,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.bearing).toBeDefined();
    });

    it("should calculate initial bearing when explicitly set to false", async () => {
      const context = createMockContext({
        start: {
          type: "Point",
          coordinates: [0, 0],
        },
        end: {
          type: "Point",
          coordinates: [1, 1],
        },
        final: false,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.bearing).toBeDefined();
    });
  });

  describe("Error handling", () => {
    it("should handle missing start point input", async () => {
      const context = createMockContext({
        end: {
          type: "Point",
          coordinates: [1, 1],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing start point input");
    });

    it("should handle missing end point input", async () => {
      const context = createMockContext({
        start: {
          type: "Point",
          coordinates: [0, 0],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing end point input");
    });

    it("should handle invalid final parameter type", async () => {
      const context = createMockContext({
        start: {
          type: "Point",
          coordinates: [0, 0],
        },
        end: {
          type: "Point",
          coordinates: [1, 1],
        },
        final: "not a boolean",
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Final parameter must be a boolean");
    });

    it("should handle null inputs", async () => {
      const context = createMockContext({
        start: null,
        end: {
          type: "Point",
          coordinates: [1, 1],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing start point input");
    });
  });

  describe("Output validation", () => {
    it("should return bearing within valid range", async () => {
      const context = createMockContext({
        start: {
          type: "Point",
          coordinates: [0, 0],
        },
        end: {
          type: "Point",
          coordinates: [1, 1],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.bearing).toBeGreaterThanOrEqual(-180);
      expect(result.outputs?.bearing).toBeLessThanOrEqual(180);
    });
  });
});
