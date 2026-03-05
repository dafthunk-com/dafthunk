import { describe, expect, it } from "vitest";
import { featureCollection, lineString, polygon } from "./helpers";
import { kinks, polygonize, unkinkPolygon } from "./topology";

describe("kinks", () => {
  it("should find at least 1 intersection in a self-intersecting polygon (figure-8)", () => {
    // Figure-8: the polygon crosses itself
    const figure8 = polygon([
      [
        [0, 0],
        [10, 10],
        [10, 0],
        [0, 10],
        [0, 0],
      ],
    ]);

    const result = kinks(figure8);
    expect(result.type).toBe("FeatureCollection");
    expect(result.features.length).toBeGreaterThanOrEqual(1);

    // Each intersection should be a Point
    for (const feat of result.features) {
      expect(feat.geometry.type).toBe("Point");
    }
  });

  it("should find 0 intersections in a simple polygon", () => {
    const simple = polygon([
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ],
    ]);

    const result = kinks(simple);
    expect(result.features).toHaveLength(0);
  });
});

describe("unkinkPolygon", () => {
  it("should split a self-intersecting polygon into valid polygons", () => {
    const figure8 = polygon([
      [
        [0, 0],
        [10, 10],
        [10, 0],
        [0, 10],
        [0, 0],
      ],
    ]);

    const result = unkinkPolygon(figure8);
    expect(result.type).toBe("FeatureCollection");
    expect(result.features.length).toBeGreaterThanOrEqual(1);

    // Each output polygon should be valid (no self-intersections)
    for (const feat of result.features) {
      expect(feat.geometry.type).toBe("Polygon");
      const selfKinks = kinks(feat);
      expect(selfKinks.features).toHaveLength(0);
    }
  });
});

describe("polygonize", () => {
  it("should create polygons from a grid of lines forming squares", () => {
    // Create a 2x2 grid of lines
    const lines = featureCollection([
      // Horizontal lines
      lineString([
        [0, 0],
        [1, 0],
        [2, 0],
      ]),
      lineString([
        [0, 1],
        [1, 1],
        [2, 1],
      ]),
      lineString([
        [0, 2],
        [1, 2],
        [2, 2],
      ]),
      // Vertical lines
      lineString([
        [0, 0],
        [0, 1],
        [0, 2],
      ]),
      lineString([
        [1, 0],
        [1, 1],
        [1, 2],
      ]),
      lineString([
        [2, 0],
        [2, 1],
        [2, 2],
      ]),
    ]);

    const result = polygonize(lines);
    expect(result.type).toBe("FeatureCollection");
    expect(result.features.length).toBeGreaterThan(0);

    // Each result should be a Polygon
    for (const feat of result.features) {
      expect(feat.geometry.type).toBe("Polygon");
    }
  });
});
