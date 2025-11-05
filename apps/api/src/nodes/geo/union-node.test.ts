import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { UnionNode } from "./union-node";

describe("UnionNode", () => {
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

  const node = new UnionNode({
    id: "test-node",
    name: "Test Node",
    type: "union",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  // Test polygons with integer coordinates
  const polygon1 = {
    type: "Feature",
    properties: { name: "Polygon 1" },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
          [0, 0],
        ],
      ],
    },
  };

  const polygon2 = {
    type: "Feature",
    properties: { name: "Polygon 2" },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [5, 5],
          [15, 5],
          [15, 15],
          [5, 15],
          [5, 5],
        ],
      ],
    },
  };

  const createFeatureCollection = (features: any[]) => ({
    type: "FeatureCollection",
    features,
  });

  describe("Node interface and behavior", () => {
    it("should have correct node type definition", () => {
      expect(UnionNode.nodeType.id).toBe("union");
      expect(UnionNode.nodeType.name).toBe("Union");
      expect(UnionNode.nodeType.type).toBe("union");
      expect(UnionNode.nodeType.inputs).toHaveLength(2);
      expect(UnionNode.nodeType.outputs).toHaveLength(1);

      const featuresInput = UnionNode.nodeType.inputs.find(
        (i) => i.name === "features"
      );
      expect(featuresInput?.type).toBe("geojson");
      expect(featuresInput?.required).toBe(true);

      const propertiesInput = UnionNode.nodeType.inputs.find(
        (i) => i.name === "properties"
      );
      expect(propertiesInput?.type).toBe("json");
      expect(propertiesInput?.required).toBe(false);

      const unionOutput = UnionNode.nodeType.outputs.find(
        (o) => o.name === "union"
      );
      expect(unionOutput?.type).toBe("geojson");
    });

    it("should successfully process valid FeatureCollection input", async () => {
      const context = createMockContext({
        features: createFeatureCollection([polygon1, polygon2]),
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.union).toBeDefined();
      expect(result.outputs?.union.type).toBe("Feature");
      expect(result.outputs?.union.geometry).toBeDefined();
      expect(result.outputs?.union.geometry.type).toBeDefined();
    });

    it("should handle properties input correctly", async () => {
      const customProperties = {
        name: "Test Union",
        operation: "union",
      };

      const context = createMockContext({
        features: createFeatureCollection([polygon1, polygon2]),
        properties: customProperties,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.union).toBeDefined();
      expect(result.outputs?.union.properties).toBeDefined();
    });

    it("should handle single polygon input", async () => {
      const context = createMockContext({
        features: createFeatureCollection([polygon1]),
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.union).toBeDefined();
    });

    it("should handle multiple polygons input", async () => {
      const polygon3 = {
        type: "Feature",
        properties: { name: "Polygon 3" },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [20, 20],
              [30, 20],
              [30, 30],
              [20, 30],
              [20, 20],
            ],
          ],
        },
      };

      const context = createMockContext({
        features: createFeatureCollection([polygon1, polygon2, polygon3]),
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.union).toBeDefined();
    });
  });

  describe("Input validation", () => {
    it("should handle missing features input", async () => {
      const context = createMockContext({});

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing features input");
    });

    it("should handle non-FeatureCollection input", async () => {
      const context = createMockContext({
        features: polygon1,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Features must be a FeatureCollection");
    });

    it("should handle FeatureCollection without features array", async () => {
      const context = createMockContext({
        features: {
          type: "FeatureCollection",
          features: null,
        },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Features must be a FeatureCollection");
    });

    it("should handle invalid feature type", async () => {
      const invalidFeature = {
        type: "Point",
        coordinates: [0, 0],
      };

      const context = createMockContext({
        features: createFeatureCollection([polygon1, invalidFeature]),
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("All features must be valid GeoJSON Features");
    });

    it("should handle non-polygon geometry type", async () => {
      const lineFeature = {
        type: "Feature",
        properties: { name: "Line" },
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [10, 10],
          ],
        },
      };

      const context = createMockContext({
        features: createFeatureCollection([polygon1, lineFeature]),
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe(
        "All features must be Polygon or MultiPolygon geometries"
      );
    });

    it("should handle null inputs", async () => {
      const context = createMockContext({
        features: null,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Missing features input");
    });
  });

  describe("MultiPolygon support", () => {
    it("should handle MultiPolygon input", async () => {
      const multiPolygon = {
        type: "Feature",
        properties: { name: "MultiPolygon" },
        geometry: {
          type: "MultiPolygon",
          coordinates: [
            [
              [
                // First polygon
                [0, 0],
                [10, 0],
                [10, 10],
                [0, 10],
                [0, 0],
              ],
            ],
            [
              [
                // Second polygon
                [20, 20],
                [30, 20],
                [30, 30],
                [20, 30],
                [20, 20],
              ],
            ],
          ],
        },
      };

      const context = createMockContext({
        features: createFeatureCollection([multiPolygon, polygon2]),
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.union).toBeDefined();
    });
  });

  describe("Properties handling", () => {
    it("should handle null properties", async () => {
      const context = createMockContext({
        features: createFeatureCollection([polygon1, polygon2]),
        properties: null,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.union).toBeDefined();
    });

    it("should handle invalid properties type", async () => {
      const context = createMockContext({
        features: createFeatureCollection([polygon1, polygon2]),
        properties: "not an object",
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.union).toBeDefined();
    });
  });
});
