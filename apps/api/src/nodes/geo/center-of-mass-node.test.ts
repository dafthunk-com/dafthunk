import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { CenterOfMassNode } from "./center-of-mass-node";

describe("CenterOfMassNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    env: {} as any,
  });

  const node = new CenterOfMassNode({
    id: "test-node",
    name: "Test Node",
    type: "centerOfMass",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  describe("Node execution", () => {
    it("should calculate center of mass for polygon", async () => {
      const context = createMockContext({
        geojson: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [2, 0],
              [2, 2],
              [0, 2],
              [0, 0],
            ],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.centerOfMass).toBeDefined();
      expect(result.outputs?.centerOfMass.type).toBe("Feature");
      expect(result.outputs?.centerOfMass.geometry.type).toBe("Point");
    });

    it("should handle properties parameter", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [1, 1],
        },
        properties: {
          name: "Test Center of Mass",
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.centerOfMass.type).toBe("Feature");
      expect(result.outputs?.centerOfMass.properties).toBeDefined();
    });
  });

  describe("Error handling", () => {
    it("should handle missing GeoJSON input", async () => {
      const context = createMockContext({});

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing GeoJSON input");
    });

    it("should handle null input", async () => {
      const context = createMockContext({
        geojson: null,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing GeoJSON input");
    });
  });
});
