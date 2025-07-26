import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { FeatureCollectionNode } from "./feature-collection-node";

describe("FeatureCollectionNode", () => {
  const createMockContext = (inputs: any) => ({
    nodeId: "feature-collection",
    inputs,
    env: {},
  } as unknown as NodeContext);



  it("should create FeatureCollection from single Feature", async () => {
    const nodeId = "feature-collection";
    const node = new FeatureCollectionNode({
      nodeId,
    } as unknown as Node);

    const pointFeature = {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [0, 0],
      },
      properties: { name: "test point" },
    };

    const context = createMockContext({ features: pointFeature });

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.featureCollection).toBeDefined();
    expect(result.outputs?.featureCollection.type).toBe("FeatureCollection");
    expect(result.outputs?.featureCollection.features).toHaveLength(1);
    expect(result.outputs?.featureCollection.features[0]).toEqual(pointFeature);
  });

  it("should create FeatureCollection from multiple Features", async () => {
    const nodeId = "feature-collection";
    const node = new FeatureCollectionNode({
      nodeId,
    } as unknown as Node);

    const pointFeature1 = {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [0, 0],
      },
      properties: { name: "point 1" },
    };

    const pointFeature2 = {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [1, 1],
      },
      properties: { name: "point 2" },
    };

    const context = createMockContext({ features: [pointFeature1, pointFeature2] });

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.featureCollection.type).toBe("FeatureCollection");
    expect(result.outputs?.featureCollection.features).toHaveLength(2);
    expect(result.outputs?.featureCollection.features[0]).toEqual(pointFeature1);
    expect(result.outputs?.featureCollection.features[1]).toEqual(pointFeature2);
  });

  it("should pass through existing FeatureCollection", async () => {
    const nodeId = "feature-collection";
    const node = new FeatureCollectionNode({
      nodeId,
    } as unknown as Node);

    const existingFeatureCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [0, 0],
          },
          properties: { name: "test" },
        },
      ],
    };

    const context = createMockContext({ features: existingFeatureCollection });

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.featureCollection).toEqual(existingFeatureCollection);
  });

  it("should handle mixed geometry types", async () => {
    const nodeId = "feature-collection";
    const node = new FeatureCollectionNode({
      nodeId,
    } as unknown as Node);

    const pointFeature = {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [0, 0],
      },
      properties: { type: "point" },
    };

    const lineFeature = {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [[0, 0], [1, 1]],
      },
      properties: { type: "line" },
    };

    const polygonFeature = {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      },
      properties: { type: "polygon" },
    };

    const context = createMockContext({ 
      features: [pointFeature, lineFeature, polygonFeature] 
    });

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.featureCollection.type).toBe("FeatureCollection");
    expect(result.outputs?.featureCollection.features).toHaveLength(3);
    expect(result.outputs?.featureCollection.features[0]).toEqual(pointFeature);
    expect(result.outputs?.featureCollection.features[1]).toEqual(lineFeature);
    expect(result.outputs?.featureCollection.features[2]).toEqual(polygonFeature);
  });

  it("should handle features with properties", async () => {
    const nodeId = "feature-collection";
    const node = new FeatureCollectionNode({
      nodeId,
    } as unknown as Node);

    const featureWithProps = {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [0, 0],
      },
      properties: {
        name: "Test Point",
        id: 123,
        tags: ["important", "test"],
        metadata: {
          created: "2023-01-01",
          author: "test user",
        },
      },
    };

    const context = createMockContext({ features: featureWithProps });

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.featureCollection.features[0]).toEqual(featureWithProps);
  });

  it("should handle features without properties", async () => {
    const nodeId = "feature-collection";
    const node = new FeatureCollectionNode({
      nodeId,
    } as unknown as Node);

    const featureWithoutProps = {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [0, 0],
      },
    };

    const context = createMockContext({ features: featureWithoutProps });

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.featureCollection.features[0]).toEqual(featureWithoutProps);
  });

  it("should return error for missing input", async () => {
    const nodeId = "feature-collection";
    const node = new FeatureCollectionNode({
      nodeId,
    } as unknown as Node);

    const context = createMockContext({});

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("No features provided");
  });

  it("should return error for null input", async () => {
    const nodeId = "feature-collection";
    const node = new FeatureCollectionNode({
      nodeId,
    } as unknown as Node);

    const context = createMockContext({ features: null });

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("No features provided");
  });

  it("should return error for empty array", async () => {
    const nodeId = "feature-collection";
    const node = new FeatureCollectionNode({
      nodeId,
    } as unknown as Node);

    const context = createMockContext({ features: [] });

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("Cannot create FeatureCollection from empty array");
  });

  it("should return error for invalid feature type", async () => {
    const nodeId = "feature-collection";
    const node = new FeatureCollectionNode({
      nodeId,
    } as unknown as Node);

    const invalidFeature = {
      type: "InvalidType",
      geometry: {
        type: "Point",
        coordinates: [0, 0],
      },
    };

    const context = createMockContext({ features: [invalidFeature] });

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("expected Feature type, got InvalidType");
  });

  it("should return error for feature without geometry", async () => {
    const nodeId = "feature-collection";
    const node = new FeatureCollectionNode({
      nodeId,
    } as unknown as Node);

    const featureWithoutGeometry = {
      type: "Feature",
      properties: { name: "test" },
    };

    const context = createMockContext({ features: [featureWithoutGeometry] });

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("missing geometry property");
  });

  it("should return error for non-object feature", async () => {
    const nodeId = "feature-collection";
    const node = new FeatureCollectionNode({
      nodeId,
    } as unknown as Node);

    const context = createMockContext({ features: ["not a feature"] });

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("expected Feature object, got string");
  });

  it("should return error for null feature in array", async () => {
    const nodeId = "feature-collection";
    const node = new FeatureCollectionNode({
      nodeId,
    } as unknown as Node);

    const validFeature = {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [0, 0],
      },
    };

    const context = createMockContext({ features: [validFeature, null] });

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("expected Feature object, got object");
  });

  it("should handle large number of features", async () => {
    const nodeId = "feature-collection";
    const node = new FeatureCollectionNode({
      nodeId,
    } as unknown as Node);

    // Create 100 point features
    const features = Array.from({ length: 100 }, (_, i) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [i, i],
      },
      properties: { id: i },
    }));

    const context = createMockContext({ features });

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.featureCollection.type).toBe("FeatureCollection");
    expect(result.outputs?.featureCollection.features).toHaveLength(100);
    
    // Verify first and last features
    expect(result.outputs?.featureCollection.features[0].properties.id).toBe(0);
    expect(result.outputs?.featureCollection.features[99].properties.id).toBe(99);
  });

  it("should handle complex geometry types", async () => {
    const nodeId = "feature-collection";
    const node = new FeatureCollectionNode({
      nodeId,
    } as unknown as Node);

    const multiPointFeature = {
      type: "Feature",
      geometry: {
        type: "MultiPoint",
        coordinates: [[0, 0], [1, 1], [2, 2]],
      },
      properties: { type: "multipoint" },
    };

    const multiLineStringFeature = {
      type: "Feature",
      geometry: {
        type: "MultiLineString",
        coordinates: [
          [[0, 0], [1, 1]],
          [[2, 2], [3, 3]],
        ],
      },
      properties: { type: "multilinestring" },
    };

    const multiPolygonFeature = {
      type: "Feature",
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
          [[[2, 2], [3, 2], [3, 3], [2, 3], [2, 2]]],
        ],
      },
      properties: { type: "multipolygon" },
    };

    const context = createMockContext({ 
      features: [multiPointFeature, multiLineStringFeature, multiPolygonFeature] 
    });

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.featureCollection.features).toHaveLength(3);
    expect(result.outputs?.featureCollection.features[0]).toEqual(multiPointFeature);
    expect(result.outputs?.featureCollection.features[1]).toEqual(multiLineStringFeature);
    expect(result.outputs?.featureCollection.features[2]).toEqual(multiPolygonFeature);
  });
}); 