import { angle } from "@turf/turf";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { AngleNode } from "./angle-node";

describe("AngleNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    env: {} as any,
  });

  const node = new AngleNode({
    id: "test-node",
    name: "Test Node",
    type: "angle",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  describe("Basic functionality", () => {
    it("should calculate angle with simple coordinates", async () => {
      const context = createMockContext({
        start: [0, 0],
        vertex: [1, 0],
        end: [1, 1],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.angle).toBeDefined();
      expect(typeof result.outputs?.angle).toBe("number");
    });

    it("should work with Point geometry objects", async () => {
      const context = createMockContext({
        start: {
          type: "Point",
          coordinates: [0, 0],
        },
        vertex: {
          type: "Point",
          coordinates: [1, 0],
        },
        end: {
          type: "Point",
          coordinates: [1, 1],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.angle).toBeDefined();
      expect(typeof result.outputs?.angle).toBe("number");
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
        vertex: {
          type: "Feature",
          properties: { name: "Vertex Point" },
          geometry: {
            type: "Point",
            coordinates: [1, 0],
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
      expect(result.outputs?.angle).toBeDefined();
      expect(typeof result.outputs?.angle).toBe("number");
    });
  });

  describe("Parameters", () => {
    it("should handle explementary parameter", async () => {
      const context = createMockContext({
        start: [0, 0],
        vertex: [1, 0],
        end: [1, 1],
        explementary: true,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.angle).toBeDefined();
      expect(typeof result.outputs?.angle).toBe("number");
    });

    it("should handle mercator parameter", async () => {
      const context = createMockContext({
        start: [0, 0],
        vertex: [1, 0],
        end: [1, 1],
        mercator: true,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.angle).toBeDefined();
      expect(typeof result.outputs?.angle).toBe("number");
    });

    it("should handle both parameters together", async () => {
      const context = createMockContext({
        start: [0, 0],
        vertex: [1, 0],
        end: [1, 1],
        explementary: true,
        mercator: true,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.angle).toBeDefined();
      expect(typeof result.outputs?.angle).toBe("number");
    });
  });

  describe("Error handling", () => {
    it("should handle missing start point input", async () => {
      const context = createMockContext({
        vertex: [1, 0],
        end: [1, 1],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing start point input");
    });

    it("should handle missing vertex point input", async () => {
      const context = createMockContext({
        start: [0, 0],
        end: [1, 1],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing vertex point input");
    });

    it("should handle missing end point input", async () => {
      const context = createMockContext({
        start: [0, 0],
        vertex: [1, 0],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing end point input");
    });

    it("should handle invalid explementary type", async () => {
      const context = createMockContext({
        start: [0, 0],
        vertex: [1, 0],
        end: [1, 1],
        explementary: "not a boolean",
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Explementary parameter must be a boolean");
    });

    it("should handle invalid mercator type", async () => {
      const context = createMockContext({
        start: [0, 0],
        vertex: [1, 0],
        end: [1, 1],
        mercator: "not a boolean",
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Mercator parameter must be a boolean");
    });
  });

  describe("Wrapper functionality", () => {
    it("should match Turf.js angle function behavior", async () => {
      const start = [0, 0];
      const vertex = [1, 0];
      const end = [1, 1];

      // Calculate using Turf.js directly
      const turfAngle = angle(start, vertex, end);

      // Calculate using our node
      const context = createMockContext({
        start,
        vertex,
        end,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.angle).toBe(turfAngle);
    });

    it("should handle explementary option correctly", async () => {
      const start = [0, 0];
      const vertex = [1, 0];
      const end = [1, 1];

      // Calculate using Turf.js directly
      const turfAngle = angle(start, vertex, end, { explementary: true });

      // Calculate using our node
      const context = createMockContext({
        start,
        vertex,
        end,
        explementary: true,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.angle).toBe(turfAngle);
    });

    it("should handle mercator option correctly", async () => {
      const start = [0, 0];
      const vertex = [1, 0];
      const end = [1, 1];

      // Calculate using Turf.js directly
      const turfAngle = angle(start, vertex, end, { mercator: true });

      // Calculate using our node
      const context = createMockContext({
        start,
        vertex,
        end,
        mercator: true,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.angle).toBe(turfAngle);
    });
  });
});
