import { describe, expect, it } from "vitest";

import { WktGeometryNode } from "./wkt-geometry-node";
import { NodeContext } from "../types";

describe("WktGeometryNode", () => {
  const createMockContext = (inputs: Record<string, any>): NodeContext => ({
    nodeId: "test-node",
    workflowId: "test-workflow",
    organizationId: "test-org",
    inputs,
    env: {} as any,
  });

  const node = new WktGeometryNode({
    id: "test-node",
    name: "Test Node",
    type: "wkt-geometry",
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
  });

  describe("Point geometry", () => {
    it("should parse valid POINT WKT", async () => {
      const context = createMockContext({
        wkt: "POINT(-122 37)"
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.geojson).toEqual({
        type: "Point",
        coordinates: [-122, 37]
      });
    });

    it("should parse POINT WKT with elevation", async () => {
      const context = createMockContext({
        wkt: "POINT Z(-122 37 100)"
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.geojson).toEqual({
        type: "Point",
        coordinates: [-122, 37, 100]
      });
    });

    it("should handle POINT EMPTY", async () => {
      const context = createMockContext({
        wkt: "POINT EMPTY"
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Failed to parse WKT string: invalid or unsupported WKT format");
    });
  });

  describe("MultiPoint geometry", () => {
    it("should parse valid MULTIPOINT WKT", async () => {
      const context = createMockContext({
        wkt: "MULTIPOINT((-122 37), (-120 35))"
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.geojson).toEqual({
        type: "MultiPoint",
        coordinates: [
          [-122, 37],
          [-120, 35]
        ]
      });
    });
  });

  describe("LineString geometry", () => {
    it("should parse valid LINESTRING WKT", async () => {
      const context = createMockContext({
        wkt: "LINESTRING(-122 37, -120 35, -118 33)"
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.geojson).toEqual({
        type: "LineString",
        coordinates: [
          [-122, 37],
          [-120, 35],
          [-118, 33]
        ]
      });
    });
  });

  describe("MultiLineString geometry", () => {
    it("should parse valid MULTILINESTRING WKT", async () => {
      const context = createMockContext({
        wkt: "MULTILINESTRING((-122 37, -120 35), (-118 33, -116 31))"
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.geojson).toEqual({
        type: "MultiLineString",
        coordinates: [
          [[-122, 37], [-120, 35]],
          [[-118, 33], [-116, 31]]
        ]
      });
    });
  });

  describe("Polygon geometry", () => {
    it("should parse valid POLYGON WKT", async () => {
      const context = createMockContext({
        wkt: "POLYGON((-122 37, -120 37, -120 35, -122 35, -122 37))"
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.geojson).toEqual({
        type: "Polygon",
        coordinates: [[
          [-122, 37],
          [-120, 37],
          [-120, 35],
          [-122, 35],
          [-122, 37]
        ]]
      });
    });

    it("should parse POLYGON with holes", async () => {
      const context = createMockContext({
        wkt: "POLYGON((-122 37, -120 37, -120 35, -122 35, -122 37), (-121 36, -121 36, -121 35, -121 35, -121 36))"
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.geojson?.coordinates).toHaveLength(2); // Outer ring + hole
    });
  });

  describe("MultiPolygon geometry", () => {
    it("should parse valid MULTIPOLYGON WKT", async () => {
      const context = createMockContext({
        wkt: "MULTIPOLYGON(((-122 37, -120 37, -120 35, -122 35, -122 37)), ((-118 33, -116 33, -116 31, -118 31, -118 33)))"
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.geojson).toEqual({
        type: "MultiPolygon",
        coordinates: [
          [[[-122, 37], [-120, 37], [-120, 35], [-122, 35], [-122, 37]]],
          [[[-118, 33], [-116, 33], [-116, 31], [-118, 31], [-118, 33]]]
        ]
      });
    });
  });

  describe("GeometryCollection", () => {
    it("should parse valid GEOMETRYCOLLECTION WKT", async () => {
      const context = createMockContext({
        wkt: "GEOMETRYCOLLECTION(POINT(-122 37), LINESTRING(-122 37, -120 35))"
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.geojson?.geometries).toHaveLength(2);
    });
  });

  describe("Case insensitivity and whitespace handling", () => {
    it("should handle lowercase WKT", async () => {
      const context = createMockContext({
        wkt: "point(-122 37)"
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.geojson?.type).toBe("Point");
    });

    it("should handle leading and trailing whitespace", async () => {
      const context = createMockContext({
        wkt: "  POINT(-122 37)  "
      });

      const result = await node.execute(context);

      expect(result.status).toBe("completed");
      expect(result.outputs?.geojson?.type).toBe("Point");
    });

    it("should fail with extra spaces in coordinates", async () => {
      const context = createMockContext({
        wkt: "POINT ( -122   37 )"
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Failed to parse WKT string: invalid or unsupported WKT format");
    });
  });

  describe("Error handling", () => {
    it("should handle missing WKT input", async () => {
      const context = createMockContext({});

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Invalid or missing WKT string input");
    });

    it("should handle non-string WKT input", async () => {
      const context = createMockContext({
        wkt: 123
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Invalid or missing WKT string input");
    });

    it("should handle empty WKT string", async () => {
      const context = createMockContext({
        wkt: ""
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Empty WKT string provided");
    });

    it("should handle whitespace-only WKT string", async () => {
      const context = createMockContext({
        wkt: "   "
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Empty WKT string provided");
    });

    it("should handle invalid WKT format", async () => {
      const context = createMockContext({
        wkt: "INVALID WKT FORMAT"
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Failed to parse WKT string: invalid or unsupported WKT format");
    });

    it("should handle malformed POINT WKT", async () => {
      const context = createMockContext({
        wkt: "POINT(-122)"
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Failed to parse WKT string: invalid or unsupported WKT format");
    });

    it("should handle invalid coordinates", async () => {
      const context = createMockContext({
        wkt: "POINT(abc def)"
      });

      const result = await node.execute(context);

      expect(result.status).toBe("error");
      expect(result.error).toBe("Failed to parse WKT string: invalid or unsupported WKT format");
    });

    it("should handle unclosed POLYGON", async () => {
      const context = createMockContext({
        wkt: "POLYGON((-122 37, -120 37, -120 35, -122 35))"
      });

      const result = await node.execute(context);

      // The wellknown library is lenient and accepts unclosed polygons
      expect(result.status).toBe("completed");
      expect(result.outputs?.geojson?.type).toBe("Polygon");
    });
  });
}); 