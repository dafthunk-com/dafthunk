import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { BooleanOverlapNode } from "./boolean-overlap-node";

describe("BooleanOverlapNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    env: {} as any,
  });

  const node = new BooleanOverlapNode({
    id: "test-node",
    name: "Test Node",
    type: "booleanOverlap",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  describe("Node execution", () => {
    it("should return result in correct output structure", async () => {
      const context = createMockContext({
        feature1: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [0, 5],
              [5, 5],
              [5, 0],
              [0, 0],
            ],
          ],
        },
        feature2: {
          type: "Polygon",
          coordinates: [
            [
              [1, 1],
              [1, 6],
              [6, 6],
              [6, 1],
              [1, 1],
            ],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs).toHaveProperty("result");
      expect(typeof result.outputs?.result).toBe("boolean");
    });

    it("should handle overlapping polygons", async () => {
      const context = createMockContext({
        feature1: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [0, 5],
              [5, 5],
              [5, 0],
              [0, 0],
            ],
          ],
        },
        feature2: {
          type: "Polygon",
          coordinates: [
            [
              [1, 1],
              [1, 6],
              [6, 6],
              [6, 1],
              [1, 1],
            ],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.result).toBe(true);
    });

    it("should handle non-overlapping polygons", async () => {
      const context = createMockContext({
        feature1: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [0, 5],
              [5, 5],
              [5, 0],
              [0, 0],
            ],
          ],
        },
        feature2: {
          type: "Polygon",
          coordinates: [
            [
              [20, 20],
              [20, 25],
              [25, 25],
              [25, 20],
              [20, 20],
            ],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(typeof result.outputs?.result).toBe("boolean");
    });

    it("should handle LineString inputs", async () => {
      const context = createMockContext({
        feature1: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [5, 5],
          ],
        },
        feature2: {
          type: "LineString",
          coordinates: [
            [1, 1],
            [6, 6],
          ],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(typeof result.outputs?.result).toBe("boolean");
    });

    it("should handle Feature inputs", async () => {
      const context = createMockContext({
        feature1: {
          type: "Feature",
          properties: { name: "Feature 1" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [0, 0],
                [0, 5],
                [5, 5],
                [5, 0],
                [0, 0],
              ],
            ],
          },
        },
        feature2: {
          type: "Feature",
          properties: { name: "Feature 2" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [1, 1],
                [1, 6],
                [6, 6],
                [6, 1],
                [1, 1],
              ],
            ],
          },
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(typeof result.outputs?.result).toBe("boolean");
    });
  });

  describe("Error handling", () => {
    it("should handle missing feature1 input", async () => {
      const context = createMockContext({
        feature2: {
          type: "Point",
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
          type: "Point",
          coordinates: [0, 0],
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing feature2 input");
    });
  });

  describe("Node type definition", () => {
    it("should have correct node type definition", () => {
      const nodeType = BooleanOverlapNode.nodeType;

      expect(nodeType.id).toBe("booleanOverlap");
      expect(nodeType.name).toBe("Boolean Overlap");
      expect(nodeType.type).toBe("booleanOverlap");
      expect(nodeType.description).toContain(
        "Compares two geometries of the same dimension"
      );
      expect(nodeType.tags).toContain("Geo");
    });

    it("should have correct input definitions", () => {
      const inputs = BooleanOverlapNode.nodeType.inputs;

      expect(inputs).toHaveLength(2);
      expect(inputs[0].name).toBe("feature1");
      expect(inputs[0].type).toBe("geojson");
      expect(inputs[0].required).toBe(true);
      expect(inputs[1].name).toBe("feature2");
      expect(inputs[1].type).toBe("geojson");
      expect(inputs[1].required).toBe(true);
    });

    it("should have correct output definitions", () => {
      const outputs = BooleanOverlapNode.nodeType.outputs;

      expect(outputs).toHaveLength(1);
      expect(outputs[0].name).toBe("result");
      expect(outputs[0].type).toBe("boolean");
      expect(outputs[0].description).toBe(
        "True if geometries overlap, false otherwise"
      );
    });
  });
});
