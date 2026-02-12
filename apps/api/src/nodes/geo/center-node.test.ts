import { describe, expect, it } from "vitest";

import { NodeContext } from "@dafthunk/runtime";
import { CenterNode } from "./center-node";

describe("CenterNode", () => {
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

  const node = new CenterNode({
    id: "test-node",
    name: "Test Node",
    type: "center",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  describe("Basic functionality", () => {
    it("should calculate center of a simple point", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [0, 0],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.center).toBeDefined();
      expect(result.outputs?.center.type).toBe("Feature");
      expect(result.outputs?.center.geometry.type).toBe("Point");
    });

    it("should apply custom properties when provided", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [0, 0],
        },
        properties: {
          name: "test center",
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.center.properties).toHaveProperty(
        "name",
        "test center"
      );
    });
  });

  describe("Input validation", () => {
    it("should handle missing GeoJSON input", async () => {
      const context = createMockContext({});

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing GeoJSON input");
    });

    it("should handle null GeoJSON input", async () => {
      const context = createMockContext({ geojson: null });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing GeoJSON input");
    });

    it("should handle invalid properties type", async () => {
      const context = createMockContext({
        geojson: { type: "Point", coordinates: [0, 0] },
        properties: "not an object",
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Properties must be an object");
    });
  });
});
