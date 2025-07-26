import { describe, expect, it } from "vitest";

import { CircleNode } from "./circle-node";
import { NodeContext } from "../types";

describe("CircleNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    env: {} as any,
  });

  const node = new CircleNode({
    id: "test-node",
    name: "Test Node",
    type: "circle",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  describe("Basic circle creation", () => {
    it("should create circle with valid center and radius", async () => {
      const context = createMockContext({
        center: {
          type: "Point",
          coordinates: [0, 0]
        },
        radius: 1
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.circle).toBeDefined();
      expect(result.outputs?.circle.type).toBe("Feature");
      expect(result.outputs?.circle.geometry.type).toBe("Polygon");
    });

    it("should work with Point Feature as center", async () => {
      const context = createMockContext({
        center: {
          type: "Feature",
          properties: { name: "Center Point" },
          geometry: {
            type: "Point",
            coordinates: [0, 0]
          }
        },
        radius: 1
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.circle).toBeDefined();
      expect(result.outputs?.circle.geometry.type).toBe("Polygon");
    });
  });

  describe("Steps parameter", () => {
    it("should work with custom steps", async () => {
      const context = createMockContext({
        center: {
          type: "Point",
          coordinates: [0, 0]
        },
        radius: 1,
        steps: 8
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.circle).toBeDefined();
    });

    it("should work with minimum steps", async () => {
      const context = createMockContext({
        center: {
          type: "Point",
          coordinates: [0, 0]
        },
        radius: 1,
        steps: 3
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.circle).toBeDefined();
    });

    it("should reject invalid steps", async () => {
      const context = createMockContext({
        center: {
          type: "Point",
          coordinates: [0, 0]
        },
        radius: 1,
        steps: 2
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Steps must be a valid number >= 3");
    });
  });

  describe("Units parameter", () => {
    it("should work with kilometers", async () => {
      const context = createMockContext({
        center: {
          type: "Point",
          coordinates: [0, 0]
        },
        radius: 1,
        units: "kilometers"
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.circle).toBeDefined();
    });

    it("should work with meters", async () => {
      const context = createMockContext({
        center: {
          type: "Point",
          coordinates: [0, 0]
        },
        radius: 1000,
        units: "meters"
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.circle).toBeDefined();
    });

    it("should work with miles", async () => {
      const context = createMockContext({
        center: {
          type: "Point",
          coordinates: [0, 0]
        },
        radius: 1,
        units: "miles"
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.circle).toBeDefined();
    });

    it("should reject non-string units", async () => {
      const context = createMockContext({
        center: {
          type: "Point",
          coordinates: [0, 0]
        },
        radius: 1,
        units: 123
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Units must be a string");
    });
  });

  describe("Properties handling", () => {
    it("should create circle with custom properties", async () => {
      const context = createMockContext({
        center: {
          type: "Point",
          coordinates: [0, 0]
        },
        radius: 1,
        properties: {
          name: "Test Circle",
          type: "buffer"
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.circle).toBeDefined();
      expect(result.outputs?.circle.properties).toEqual({
        name: "Test Circle",
        type: "buffer"
      });
    });

    it("should reject non-object properties", async () => {
      const context = createMockContext({
        center: {
          type: "Point",
          coordinates: [0, 0]
        },
        radius: 1,
        properties: "not an object"
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Properties must be an object");
    });
  });

  describe("Error handling", () => {
    it("should handle missing center input", async () => {
      const context = createMockContext({
        radius: 1
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing center point input");
    });

    it("should handle missing radius input", async () => {
      const context = createMockContext({
        center: {
          type: "Point",
          coordinates: [0, 0]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing radius input");
    });

    it("should handle invalid radius type", async () => {
      const context = createMockContext({
        center: {
          type: "Point",
          coordinates: [0, 0]
        },
        radius: "not a number"
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Radius must be a positive number");
    });

    it("should handle zero radius", async () => {
      const context = createMockContext({
        center: {
          type: "Point",
          coordinates: [0, 0]
        },
        radius: 0
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Radius must be a positive number");
    });

    it("should handle negative radius", async () => {
      const context = createMockContext({
        center: {
          type: "Point",
          coordinates: [0, 0]
        },
        radius: -1
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Radius must be a positive number");
    });

    it("should handle null inputs", async () => {
      const context = createMockContext({
        center: null,
        radius: 1
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing center point input");
    });
  });
});