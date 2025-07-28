import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { PolygonNode } from "./polygon-node";

describe("PolygonNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    env: {} as any,
  });

  const node = new PolygonNode({
    id: "test-node",
    name: "Test Node",
    type: "polygon",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  describe("Basic functionality", () => {
    it("should create polygon with coordinates", async () => {
      const context = createMockContext({
        coordinates: [
          [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
            [0, 0],
          ],
        ],
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.polygon).toBeDefined();
      expect(result.outputs?.polygon.type).toBe("Feature");
      expect(result.outputs?.polygon.geometry.type).toBe("Polygon");
    });

    it("should handle properties input", async () => {
      const context = createMockContext({
        coordinates: [
          [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
            [0, 0],
          ],
        ],
        properties: {
          name: "Test Area",
          type: "boundary",
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.polygon).toBeDefined();
    });
  });

  describe("Error handling", () => {
    it("should handle missing coordinates", async () => {
      const context = createMockContext({});

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing coordinates input");
    });

    it("should handle null coordinates", async () => {
      const context = createMockContext({
        coordinates: null,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing coordinates input");
    });

    it("should handle invalid properties type", async () => {
      const context = createMockContext({
        coordinates: [
          [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
            [0, 0],
          ],
        ],
        properties: "not an object",
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Properties must be an object");
    });
  });
});
