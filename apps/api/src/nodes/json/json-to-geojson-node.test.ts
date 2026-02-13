import { NodeContext } from "@dafthunk/runtime";
import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";
import { JsonToGeojsonNode } from "./json-to-geojson-node";

describe("JsonToGeojsonNode", () => {
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

  const createNode = (): JsonToGeojsonNode => {
    const node: Node = {
      id: "test-node",
      name: "Test JSON to GeoJSON Node",
      type: "json-to-geojson",
      position: { x: 0, y: 0 },
      inputs: [],
      outputs: [],
    };
    return new JsonToGeojsonNode(node);
  };

  describe("valid GeoJSON inputs", () => {
    it("should convert valid Point geometry", async () => {
      const node = createNode();
      const point = {
        type: "Point",
        coordinates: [10, 20],
      };

      const context = createMockContext({ json: point });
      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.geojson).toEqual(point);
    });

    it("should convert valid LineString geometry", async () => {
      const node = createNode();
      const lineString = {
        type: "LineString",
        coordinates: [
          [0, 0],
          [10, 10],
          [20, 0],
        ],
      };

      const context = createMockContext({ json: lineString });
      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.geojson).toEqual(lineString);
    });

    it("should convert valid Polygon geometry", async () => {
      const node = createNode();
      const polygon = {
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
      };

      const context = createMockContext({ json: polygon });
      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.geojson).toEqual(polygon);
    });

    it("should convert valid Feature", async () => {
      const node = createNode();
      const feature = {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [5, 5],
        },
        properties: {
          name: "Test Point",
        },
      };

      const context = createMockContext({ json: feature });
      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.geojson).toEqual(feature);
    });

    it("should convert valid FeatureCollection", async () => {
      const node = createNode();
      const featureCollection = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [5, 5],
            },
            properties: {
              name: "Test Point",
            },
          },
        ],
      };

      const context = createMockContext({ json: featureCollection });
      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.geojson).toEqual(featureCollection);
    });
  });

  describe("JSON string inputs", () => {
    it("should parse and convert JSON string to GeoJSON", async () => {
      const node = createNode();
      const geojsonString = JSON.stringify({
        type: "Point",
        coordinates: [10, 20],
      });

      const context = createMockContext({ json: geojsonString });
      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.geojson).toEqual({
        type: "Point",
        coordinates: [10, 20],
      });
    });

    it("should parse and convert Feature JSON string", async () => {
      const node = createNode();
      const featureString = JSON.stringify({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [5, 5],
        },
        properties: {
          fill: "#ff0000",
        },
      });

      const context = createMockContext({ json: featureString });
      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.geojson).toEqual({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [5, 5],
        },
        properties: {
          fill: "#ff0000",
        },
      });
    });
  });

  describe("error handling", () => {
    it("should return error for missing input", async () => {
      const node = createNode();
      const context = createMockContext({});

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toContain("JSON input is required");
    });

    it("should return error for null input", async () => {
      const node = createNode();
      const context = createMockContext({ json: null });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toContain("JSON input is required");
    });

    it("should return error for undefined input", async () => {
      const node = createNode();
      const context = createMockContext({ json: undefined });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toContain("JSON input is required");
    });

    it("should return error for invalid JSON string", async () => {
      const node = createNode();
      const context = createMockContext({ json: "{ invalid json }" });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toContain("Invalid JSON string");
    });

    it("should return error for unsupported input type", async () => {
      const node = createNode();
      const context = createMockContext({ json: 123 });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toContain("Unsupported input type");
    });

    it("should return error for non-object input", async () => {
      const node = createNode();
      const context = createMockContext({ json: "123" }); // Valid JSON but not an object

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toContain("Input must be an object");
    });

    it("should return error for missing type property", async () => {
      const node = createNode();
      const context = createMockContext({
        json: { coordinates: [10, 20] },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toContain("Input must have a 'type' property");
    });

    it("should return error for invalid GeoJSON type", async () => {
      const node = createNode();
      const context = createMockContext({
        json: { type: "InvalidType", coordinates: [10, 20] },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toContain("Invalid GeoJSON format");
    });

    it("should return error for invalid geometry structure", async () => {
      const node = createNode();
      const context = createMockContext({
        json: { type: "Point", coordinates: "not an array" },
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toContain("Invalid GeoJSON format");
    });
  });
});
