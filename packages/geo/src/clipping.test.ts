import * as turf from "@turf/turf";
import { describe, expect, it } from "vitest";
import { bboxClip, difference, intersect, mask, union } from "./clipping";
import { featureCollection, polygon } from "./helpers";
import { area } from "./measurement";

describe("union", () => {
  it("should compute the union of two overlapping squares and match turf area", () => {
    const sq1 = polygon([
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ],
    ]);
    const sq2 = polygon([
      [
        [5, 5],
        [15, 5],
        [15, 15],
        [5, 15],
        [5, 5],
      ],
    ]);

    const fc = featureCollection([sq1, sq2]);
    const result = union(fc);

    const turfResult = turf.union(
      turf.featureCollection([
        turf.polygon([
          [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
            [0, 0],
          ],
        ]),
        turf.polygon([
          [
            [5, 5],
            [15, 5],
            [15, 15],
            [5, 15],
            [5, 5],
          ],
        ]),
      ])
    );

    expect(result).not.toBeNull();
    expect(turfResult).not.toBeNull();
    expect(area(result?.geometry)).toBeCloseTo(area(turfResult?.geometry), 0);
  });

  it("should return a MultiPolygon for two disjoint squares", () => {
    const sq1 = polygon([
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ],
    ]);
    const sq2 = polygon([
      [
        [10, 10],
        [11, 10],
        [11, 11],
        [10, 11],
        [10, 10],
      ],
    ]);

    const fc = featureCollection([sq1, sq2]);
    const result = union(fc);

    expect(result).not.toBeNull();
    expect(result?.geometry.type).toBe("MultiPolygon");
  });
});

describe("intersect", () => {
  it("should compute the intersection of two overlapping squares and match turf area", () => {
    const sq1 = polygon([
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ],
    ]);
    const sq2 = polygon([
      [
        [5, 5],
        [15, 5],
        [15, 15],
        [5, 15],
        [5, 5],
      ],
    ]);

    const result = intersect(sq1, sq2);
    const turfResult = turf.intersect(
      turf.featureCollection([
        turf.polygon([
          [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
            [0, 0],
          ],
        ]),
        turf.polygon([
          [
            [5, 5],
            [15, 5],
            [15, 15],
            [5, 15],
            [5, 5],
          ],
        ]),
      ])
    );

    expect(result).not.toBeNull();
    expect(turfResult).not.toBeNull();
    expect(area(result?.geometry)).toBeCloseTo(area(turfResult?.geometry), 0);
  });

  it("should return null for disjoint polygons", () => {
    const sq1 = polygon([
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ],
    ]);
    const sq2 = polygon([
      [
        [10, 10],
        [11, 10],
        [11, 11],
        [10, 11],
        [10, 10],
      ],
    ]);

    const result = intersect(sq1, sq2);
    expect(result).toBeNull();
  });
});

describe("difference", () => {
  it("should compute the difference of two overlapping squares and match turf", () => {
    const sq1 = polygon([
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ],
    ]);
    const sq2 = polygon([
      [
        [5, 5],
        [15, 5],
        [15, 15],
        [5, 15],
        [5, 5],
      ],
    ]);

    const result = difference(sq1, sq2);
    const turfResult = turf.difference(
      turf.featureCollection([
        turf.polygon([
          [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
            [0, 0],
          ],
        ]),
        turf.polygon([
          [
            [5, 5],
            [15, 5],
            [15, 15],
            [5, 15],
            [5, 5],
          ],
        ]),
      ])
    );

    expect(result).not.toBeNull();
    expect(turfResult).not.toBeNull();
    expect(area(result?.geometry)).toBeCloseTo(area(turfResult?.geometry), 0);
  });
});

describe("bboxClip", () => {
  it("should clip a polygon partially outside the bbox", () => {
    const poly = polygon([
      [
        [-10, -10],
        [10, -10],
        [10, 10],
        [-10, 10],
        [-10, -10],
      ],
    ]);

    const result = bboxClip(poly, [0, 0, 20, 20]);

    expect(result).not.toBeNull();
    expect(result.geometry.type).toBe("Polygon");

    // The clipped area should be roughly a quarter of the original
    const clippedArea = area(result.geometry);
    const originalArea = area(poly.geometry);
    expect(clippedArea).toBeLessThan(originalArea);
    expect(clippedArea).toBeGreaterThan(0);
  });
});

describe("mask", () => {
  it("should create a mask with the default world extent", () => {
    const poly = polygon([
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ],
    ]);

    const result = mask(poly);
    expect(result.geometry.type).toBe("Polygon");
    // Should have 2 rings: outer (world) and inner (hole = input polygon)
    expect(result.geometry.coordinates).toHaveLength(2);
  });

  it("should create a mask with a custom mask polygon", () => {
    const poly = polygon([
      [
        [2, 2],
        [8, 2],
        [8, 8],
        [2, 8],
        [2, 2],
      ],
    ]);
    const customMask = polygon([
      [
        [0, 0],
        [20, 0],
        [20, 20],
        [0, 20],
        [0, 0],
      ],
    ]);

    const result = mask(poly, customMask);
    expect(result.geometry.type).toBe("Polygon");
    expect(result.geometry.coordinates).toHaveLength(2);
    // Outer ring should match the custom mask
    expect(result.geometry.coordinates[0][0]).toEqual([0, 0]);
  });
});
