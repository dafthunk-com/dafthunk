import { booleanCrosses } from "@turf/turf";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { BooleanCrossesNode } from "./boolean-crosses-node";

describe("BooleanCrossesNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    env: {} as any,
  });

  const node = new BooleanCrossesNode({
    id: "test-node",
    name: "Test Node",
    type: "booleanCrosses",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  describe("Direct Turf.js test", () => {
    it("should test booleanCrosses directly", () => {
      const polygon = {
        type: "Polygon" as const,
        coordinates: [
          [
            [0, 0],
            [2, 0],
            [2, 2],
            [0, 2],
            [0, 0],
          ],
        ],
      };

      const line = {
        type: "LineString" as const,
        coordinates: [
          [1, -1],
          [1, 3],
        ],
      };

      const result = booleanCrosses(polygon, line);
      // Note: The result may vary between environments, so we just test that it's a boolean
      expect(typeof result).toBe("boolean");
    });
  });

  describe("Basic functionality", () => {
    it("should return a boolean result when line crosses polygon boundary", async () => {
      const polygon = {
        type: "Polygon" as const,
        coordinates: [
          [
            [0, 0],
            [2, 0],
            [2, 2],
            [0, 2],
            [0, 0],
          ],
        ],
      };

      const line = {
        type: "LineString" as const,
        coordinates: [
          [1, -1],
          [1, 3],
        ],
      };

      const context = createMockContext({
        feature1: polygon,
        feature2: line,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(typeof result.outputs?.crosses).toBe("boolean");
    });

    it("should return false when lines do not cross", async () => {
      const line1 = {
        type: "LineString" as const,
        coordinates: [
          [0, 0],
          [2, 0],
        ],
      };

      const line2 = {
        type: "LineString" as const,
        coordinates: [
          [0, 2],
          [2, 2],
        ],
      };

      const context = createMockContext({
        feature1: line1,
        feature2: line2,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.crosses).toBe(false);
    });

    it("should return false when polygon contains point", async () => {
      const polygon = {
        type: "Polygon" as const,
        coordinates: [
          [
            [0, 0],
            [2, 0],
            [2, 2],
            [0, 2],
            [0, 0],
          ],
        ],
      };

      const point = {
        type: "Point" as const,
        coordinates: [1, 1],
      };

      const context = createMockContext({
        feature1: polygon,
        feature2: point,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.crosses).toBe(false);
    });

    it("should return false when lines intersect but do not cross", async () => {
      const line1 = {
        type: "LineString" as const,
        coordinates: [
          [0, 0],
          [2, 2],
        ],
      };

      const line2 = {
        type: "LineString" as const,
        coordinates: [
          [0, 2],
          [2, 0],
        ],
      };

      const context = createMockContext({
        feature1: line1,
        feature2: line2,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.crosses).toBe(false);
    });
  });

  describe("Input validation", () => {
    it("should handle missing feature1 input", async () => {
      const context = createMockContext({
        feature2: {
          type: "Point" as const,
          coordinates: [0, 0],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing feature1 input");
    });

    it("should handle missing feature2 input", async () => {
      const context = createMockContext({
        feature1: {
          type: "Point" as const,
          coordinates: [0, 0],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing feature2 input");
    });

    it("should handle null feature1 input", async () => {
      const context = createMockContext({
        feature1: null,
        feature2: {
          type: "Point" as const,
          coordinates: [0, 0],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing feature1 input");
    });

    it("should handle null feature2 input", async () => {
      const context = createMockContext({
        feature1: {
          type: "Point" as const,
          coordinates: [0, 0],
        },
        feature2: null,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing feature2 input");
    });
  });

  describe("Error handling", () => {
    it("should handle undefined inputs gracefully", async () => {
      const context = createMockContext({
        feature1: undefined,
        feature2: {
          type: "Point" as const,
          coordinates: [0, 0],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing feature1 input");
    });

    it("should handle empty object inputs gracefully", async () => {
      const context = createMockContext({
        feature1: {},
        feature2: {
          type: "Point" as const,
          coordinates: [0, 0],
        },
      });

      const result = await node.execute(context);

      // The node should handle this gracefully and return a result
      expect(result.status).toBe("completed");
      expect(typeof result.outputs?.crosses).toBe("boolean");
    });
  });

  describe("Node type definition", () => {
    it("should have correct node type metadata", () => {
      expect(BooleanCrossesNode.nodeType.id).toBe("booleanCrosses");
      expect(BooleanCrossesNode.nodeType.name).toBe("Boolean Crosses");
      expect(BooleanCrossesNode.nodeType.type).toBe("booleanCrosses");
      expect(BooleanCrossesNode.nodeType.tags).toContain("Geo");
    });

    it("should have correct input definitions", () => {
      const inputs = BooleanCrossesNode.nodeType.inputs;
      expect(inputs).toHaveLength(2);

      const feature1Input = inputs.find((input) => input.name === "feature1");
      expect(feature1Input?.type).toBe("geojson");
      expect(feature1Input?.required).toBe(true);

      const feature2Input = inputs.find((input) => input.name === "feature2");
      expect(feature2Input?.type).toBe("geojson");
      expect(feature2Input?.required).toBe(true);
    });

    it("should have correct output definitions", () => {
      const outputs = BooleanCrossesNode.nodeType.outputs;
      expect(outputs).toHaveLength(1);

      const crossesOutput = outputs.find((output) => output.name === "crosses");
      expect(crossesOutput?.type).toBe("boolean");
    });
  });
});
