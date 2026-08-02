import { describe, expect, it } from "vitest";
import {
  extractPosition,
  isGeoJSON,
  isGeoJSONOf,
  isUnits,
  UNITS_LIST,
} from "./geo-input";

describe("geo-input", () => {
  describe("isUnits", () => {
    it("accepts every supported unit", () => {
      for (const unit of UNITS_LIST.split(", ")) {
        expect(isUnits(unit)).toBe(true);
      }
    });

    it("rejects unknown units and non-strings", () => {
      expect(isUnits("parsecs")).toBe(false);
      expect(isUnits("Kilometers")).toBe(false);
      expect(isUnits(42)).toBe(false);
      expect(isUnits(null)).toBe(false);
      expect(isUnits(undefined)).toBe(false);
    });
  });

  describe("isGeoJSON", () => {
    it("accepts geometries, features and collections", () => {
      expect(isGeoJSON({ type: "Point", coordinates: [0, 0] })).toBe(true);
      expect(isGeoJSON({ type: "Feature" })).toBe(true);
      expect(isGeoJSON({ type: "FeatureCollection", features: [] })).toBe(true);
      expect(isGeoJSON({ type: "GeometryCollection", geometries: [] })).toBe(
        true
      );
    });

    it("rejects anything without a known GeoJSON type", () => {
      expect(isGeoJSON({ type: "Circle" })).toBe(false);
      expect(isGeoJSON({})).toBe(false);
      expect(isGeoJSON(null)).toBe(false);
      expect(isGeoJSON("Point")).toBe(false);
    });
  });

  describe("isGeoJSONOf", () => {
    it("matches a bare geometry of the requested type", () => {
      expect(isGeoJSONOf({ type: "Polygon", coordinates: [] }, "Polygon")).toBe(
        true
      );
    });

    it("matches a feature by its geometry type", () => {
      const feature = {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [] },
      };
      expect(isGeoJSONOf(feature, "Polygon")).toBe(true);
      expect(isGeoJSONOf(feature, "LineString")).toBe(false);
    });

    it("rejects other geometry types", () => {
      expect(
        isGeoJSONOf({ type: "Point", coordinates: [0, 0] }, "Polygon")
      ).toBe(false);
    });

    it("rejects values that are not GeoJSON at all", () => {
      expect(isGeoJSONOf(null, "Polygon")).toBe(false);
      expect(isGeoJSONOf({ type: "Nope" }, "Polygon")).toBe(false);
    });
  });

  describe("extractPosition", () => {
    it("reads a bare coordinate pair", () => {
      expect(extractPosition([1, 2])).toEqual([1, 2]);
    });

    it("ignores extra ordinates such as elevation", () => {
      expect(extractPosition([1, 2, 3])).toEqual([1, 2]);
    });

    it("reads a Point geometry", () => {
      expect(extractPosition({ type: "Point", coordinates: [3, 4] })).toEqual([
        3, 4,
      ]);
    });

    it("reads a Feature wrapping a Point", () => {
      expect(
        extractPosition({
          type: "Feature",
          geometry: { type: "Point", coordinates: [5, 6] },
        })
      ).toEqual([5, 6]);
    });

    it("returns null for anything else", () => {
      expect(extractPosition(null)).toBeNull();
      expect(extractPosition([1])).toBeNull();
      expect(extractPosition(["a", "b"])).toBeNull();
      expect(
        extractPosition({ type: "LineString", coordinates: [[1, 2]] })
      ).toBeNull();
      expect(extractPosition("1,2")).toBeNull();
    });
  });
});
