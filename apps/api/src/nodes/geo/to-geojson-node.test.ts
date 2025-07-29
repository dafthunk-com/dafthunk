import { Node } from "@dafthunk/types";
import { describe, expect, it } from "vitest";

import { NodeContext } from "../types";
import { ToGeoJsonNode } from "./to-geojson-node";

describe("ToGeoJsonNode", () => {
  it("should convert coordinate array to GeoJSON Point", async () => {
    const nodeId = "to-geojson";
    const node = new ToGeoJsonNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        input: [-122.4194, 37.7749], // San Francisco coordinates
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs).toBeDefined();
    expect(result.outputs?.result).toEqual({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [-122.4194, 37.7749],
      },
      properties: {},
    });
  });

  it("should convert coordinate string to GeoJSON Point", async () => {
    const nodeId = "to-geojson";
    const node = new ToGeoJsonNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        input: "37.7749,-122.4194", // lat,lng format
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [-122.4194, 37.7749], // Should convert to lng,lat
      },
      properties: {},
    });
  });

  it("should convert lat/lng object to GeoJSON Point", async () => {
    const nodeId = "to-geojson";
    const node = new ToGeoJsonNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        input: { lat: 37.7749, lng: -122.4194 },
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [-122.4194, 37.7749],
      },
      properties: {},
    });
  });

  it("should convert latitude/longitude object to GeoJSON Point", async () => {
    const nodeId = "to-geojson";
    const node = new ToGeoJsonNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        input: { latitude: 37.7749, longitude: -122.4194 },
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [-122.4194, 37.7749],
      },
      properties: {},
    });
  });

  it("should handle array of coordinates as LineString", async () => {
    const nodeId = "to-geojson";
    const node = new ToGeoJsonNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        input: [
          [-122.4194, 37.7749],
          [-122.4094, 37.7849],
          [-122.3994, 37.7949],
        ],
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [-122.4194, 37.7749],
          [-122.4094, 37.7849],
          [-122.3994, 37.7949],
        ],
      },
      properties: {},
    });
  });

  it("should include custom properties", async () => {
    const nodeId = "to-geojson";
    const node = new ToGeoJsonNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        input: [-122.4194, 37.7749],
        properties: { name: "San Francisco", population: 883305 },
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [-122.4194, 37.7749],
      },
      properties: { name: "San Francisco", population: 883305 },
    });
  });

  it("should handle existing geometry object", async () => {
    const nodeId = "to-geojson";
    const node = new ToGeoJsonNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        input: {
          type: "Polygon",
          coordinates: [
            [
              [-122.4194, 37.7749],
              [-122.4094, 37.7749],
              [-122.4094, 37.7849],
              [-122.4194, 37.7849],
              [-122.4194, 37.7749],
            ],
          ],
        },
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-122.4194, 37.7749],
            [-122.4094, 37.7749],
            [-122.4094, 37.7849],
            [-122.4194, 37.7849],
            [-122.4194, 37.7749],
          ],
        ],
      },
      properties: {},
    });
  });

  it("should handle space-separated coordinate string", async () => {
    const nodeId = "to-geojson";
    const node = new ToGeoJsonNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        input: "37.7749 -122.4194", // lat lng format
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("completed");
    expect(result.outputs?.result).toEqual({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [-122.4194, 37.7749],
      },
      properties: {},
    });
  });

  it("should handle null input", async () => {
    const nodeId = "to-geojson";
    const node = new ToGeoJsonNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        input: null,
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Input is required");
  });

  it("should handle undefined input", async () => {
    const nodeId = "to-geojson";
    const node = new ToGeoJsonNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {},
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Input is required");
  });

  it("should handle invalid coordinate string", async () => {
    const nodeId = "to-geojson";
    const node = new ToGeoJsonNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        input: "invalid coordinates",
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("Unable to parse coordinates from string");
  });

  it("should handle invalid coordinate array", async () => {
    const nodeId = "to-geojson";
    const node = new ToGeoJsonNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        input: [1, "invalid", 3],
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Invalid coordinate array format");
  });

  it("should handle invalid object format", async () => {
    const nodeId = "to-geojson";
    const node = new ToGeoJsonNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        input: { invalidProperty: "test" },
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toContain("Unrecognized object format");
  });

  it("should handle invalid lat/lng values", async () => {
    const nodeId = "to-geojson";
    const node = new ToGeoJsonNode({
      nodeId,
    } as unknown as Node);

    const context = {
      nodeId,
      inputs: {
        input: { lat: "invalid", lng: -122.4194 },
      },
      env: {},
    } as unknown as NodeContext;

    const result = await node.execute(context);
    expect(result.status).toBe("error");
    expect(result.error).toBe("Invalid lat/lng values in object");
  });
});
