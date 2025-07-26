import { describe, expect, it } from "vitest";

import { MidpointNode } from "./midpoint-node";
import { NodeContext } from "../types";

describe("MidpointNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    env: {} as any,
  });

  const node = new MidpointNode({
    id: "test-node",
    name: "Test Node",
    type: "midpoint",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  describe("Basic functionality", () => {
    it("should calculate midpoint between two points", async () => {
      const context = createMockContext({
        point1: {
          type: "Point",
          coordinates: [0, 0]
        },
        point2: {
          type: "Point",
          coordinates: [10, 10]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.midpoint).toBeDefined();
      expect(result.outputs?.midpoint.type).toBe("Feature");
      expect(result.outputs?.midpoint.geometry.type).toBe("Point");
      expect(Array.isArray(result.outputs?.midpoint.geometry.coordinates)).toBe(true);
      expect(result.outputs?.midpoint.geometry.coordinates).toHaveLength(2);
    });

    it("should work with Point Features", async () => {
      const context = createMockContext({
        point1: {
          type: "Feature",
          properties: { name: "Point 1" },
          geometry: {
            type: "Point",
            coordinates: [0, 0]
          }
        },
        point2: {
          type: "Feature",
          properties: { name: "Point 2" },
          geometry: {
            type: "Point",
            coordinates: [10, 10]
          }
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.midpoint).toBeDefined();
      expect(result.outputs?.midpoint.type).toBe("Feature");
      expect(result.outputs?.midpoint.geometry.type).toBe("Point");
    });
  });

  describe("Error handling", () => {
    it("should handle missing point1 input", async () => {
      const context = createMockContext({
        point2: {
          type: "Point",
          coordinates: [10, 10]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing point1 input");
    });

    it("should handle missing point2 input", async () => {
      const context = createMockContext({
        point1: {
          type: "Point",
          coordinates: [0, 0]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing point2 input");
    });

    it("should handle null inputs", async () => {
      const context = createMockContext({
        point1: null,
        point2: {
          type: "Point",
          coordinates: [10, 10]
        }
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing point1 input");
    });
  });
}); 