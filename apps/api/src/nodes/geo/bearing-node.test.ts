import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { BearingNode } from "./bearing-node";

describe("BearingNode", () => {
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

  const node = new BearingNode({
    id: "test-node",
    name: "Test Node",
    type: "bearing",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  describe("Input validation", () => {
    it("should handle missing start point input", async () => {
      const context = createMockContext({
        end: [0, 0],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing start point input");
    });

    it("should handle missing end point input", async () => {
      const context = createMockContext({
        start: [0, 0],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing end point input");
    });

    it("should handle invalid start point format", async () => {
      const context = createMockContext({
        start: "invalid",
        end: [0, 0],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe(
        "Invalid start point - must be coordinates [lng, lat] or Point geometry"
      );
    });

    it("should handle invalid end point format", async () => {
      const context = createMockContext({
        start: [0, 0],
        end: "invalid",
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe(
        "Invalid end point - must be coordinates [lng, lat] or Point geometry"
      );
    });

    it("should handle invalid final parameter type", async () => {
      const context = createMockContext({
        start: [0, 0],
        end: [1, 1],
        final: "not a boolean",
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Final parameter must be a boolean");
    });
  });

  describe("Coordinate extraction", () => {
    it("should accept coordinate arrays directly", async () => {
      const context = createMockContext({
        start: [0, 0],
        end: [1, 1],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.bearing).toBeDefined();
      expect(typeof result.outputs?.bearing).toBe("number");
    });

    it("should extract coordinates from Point geometry", async () => {
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

    it("should extract coordinates from Point Feature", async () => {
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
      expect(result.outputs?.bearing).toBeDefined();
      expect(typeof result.outputs?.bearing).toBe("number");
    });
  });

  describe("Final parameter", () => {
    it("should use final=false by default", async () => {
      const context = createMockContext({
        start: [0, 0],
        end: [1, 1],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.bearing).toBeDefined();
    });

    it("should accept final=true", async () => {
      const context = createMockContext({
        start: [0, 0],
        end: [1, 1],
        final: true,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.bearing).toBeDefined();
    });

    it("should accept final=false explicitly", async () => {
      const context = createMockContext({
        start: [0, 0],
        end: [1, 1],
        final: false,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.bearing).toBeDefined();
    });
  });

  describe("Basic functionality", () => {
    it("should return a number between -180 and 180", async () => {
      const context = createMockContext({
        start: [0, 0],
        end: [1, 1],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.bearing).toBeGreaterThanOrEqual(-180);
      expect(result.outputs?.bearing).toBeLessThanOrEqual(180);
    });

    it("should handle same start and end points", async () => {
      const context = createMockContext({
        start: [0, 0],
        end: [0, 0],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.bearing).toBeDefined();
      expect(typeof result.outputs?.bearing).toBe("number");
    });
  });
});
