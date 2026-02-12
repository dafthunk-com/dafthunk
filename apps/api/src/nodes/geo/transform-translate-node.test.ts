import { describe, expect, it } from "vitest";

import { NodeContext } from "@dafthunk/runtime";
import { TransformTranslateNode } from "./transform-translate-node";

describe("TransformTranslateNode", () => {
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

  const node = new TransformTranslateNode({
    id: "test-node",
    name: "Test Node",
    type: "transformTranslate",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  describe("Basic functionality", () => {
    it("should successfully translate a point", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [0, 0],
        },
        distance: 10,
        direction: 0,
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.translated).toBeDefined();
      // Turf.js returns the geometry type directly when given a geometry
      expect(result.outputs?.translated.type).toBe("Point");
      expect(result.outputs?.translated.coordinates).toHaveLength(2);
    });

    it("should handle different geometry types", async () => {
      const geometries = [
        {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 1],
            [2, 2],
          ],
        },
        {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
              [0, 0],
            ],
          ],
        },
        {
          type: "MultiPoint",
          coordinates: [
            [0, 0],
            [1, 1],
            [2, 2],
          ],
        },
      ];

      for (const geometry of geometries) {
        const context = createMockContext({
          geojson: geometry,
          distance: 5,
          direction: 45,
        });

        const result = await node.execute(context);
        expect(result.status).toBe("completed");
        expect(result.outputs?.translated).toBeDefined();
      }
    });

    it("should handle Feature and FeatureCollection", async () => {
      const feature = {
        type: "Feature",
        properties: { name: "Test" },
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
      };

      const featureCollection = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { id: 1 },
            geometry: {
              type: "Point",
              coordinates: [0, 0],
            },
          },
          {
            type: "Feature",
            properties: { id: 2 },
            geometry: {
              type: "Point",
              coordinates: [1, 1],
            },
          },
        ],
      };

      // Test Feature
      const featureContext = createMockContext({
        geojson: feature,
        distance: 10,
        direction: 0,
      });
      const featureResult = await node.execute(featureContext);
      expect(featureResult.status).toBe("completed");
      expect(featureResult.outputs?.translated.type).toBe("Feature");

      // Test FeatureCollection
      const collectionContext = createMockContext({
        geojson: featureCollection,
        distance: 10,
        direction: 0,
      });
      const collectionResult = await node.execute(collectionContext);
      expect(collectionResult.status).toBe("completed");
      expect(collectionResult.outputs?.translated.type).toBe(
        "FeatureCollection"
      );
    });
  });

  describe("Parameter handling", () => {
    it("should handle optional units parameter", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [0, 0],
        },
        distance: 10,
        direction: 0,
        units: "miles",
      });

      const result = await node.execute(context);
      expect(result.status).toBe("completed");
      expect(result.outputs?.translated).toBeDefined();
    });

    it("should handle optional mutate parameter", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [0, 0],
        },
        distance: 10,
        direction: 0,
        mutate: true,
      });

      const result = await node.execute(context);
      expect(result.status).toBe("completed");
      expect(result.outputs?.translated).toBeDefined();
    });

    it("should work without optional parameters", async () => {
      const context = createMockContext({
        geojson: {
          type: "Point",
          coordinates: [0, 0],
        },
        distance: 10,
        direction: 0,
      });

      const result = await node.execute(context);
      expect(result.status).toBe("completed");
      expect(result.outputs?.translated).toBeDefined();
    });
  });
});
