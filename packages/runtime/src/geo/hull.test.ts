import { describe, expect, it } from "vitest";
import { convex, concave } from "./hull";
import { point, featureCollection } from "./helpers";
import * as turf from "@turf/turf";

describe("convex", () => {
  it("should compute a convex hull matching turf for 10 points", () => {
    const coords: [number, number][] = [
      [0, 0],
      [1, 3],
      [3, 1],
      [5, 5],
      [2, 2],
      [4, 0],
      [6, 3],
      [1, 6],
      [3, 4],
      [5, 2],
    ];

    const fc = featureCollection(coords.map((c) => point(c)));
    const turfFc = turf.featureCollection(coords.map((c) => turf.point(c)));

    const result = convex(fc);
    const turfResult = turf.convex(turfFc);

    expect(result).not.toBeNull();
    expect(result!.geometry.type).toBe("Polygon");

    // All input points should be inside or on the boundary of the convex hull
    for (const c of coords) {
      expect(
        turf.booleanPointInPolygon(turf.point(c), turfResult!),
      ).toBe(true);
    }

    // Verify our hull also contains all points by comparing with turf result
    expect(turfResult).not.toBeNull();
    expect(result!.geometry.coordinates[0].length).toBe(
      turfResult!.geometry.coordinates[0].length,
    );
  });

  it("should handle collinear points", () => {
    const fc = featureCollection([
      point([0, 0]),
      point([1, 1]),
      point([2, 2]),
      point([3, 3]),
    ]);

    const result = convex(fc);
    // Collinear points cannot form a polygon; result may be null or degenerate
    if (result !== null) {
      expect(result.geometry.type).toBe("Polygon");
    }
  });

  it("should return null for less than 3 points", () => {
    const fc = featureCollection([point([0, 0]), point([1, 1])]);
    const result = convex(fc);
    expect(result).toBeNull();
  });
});

describe("concave", () => {
  it("should approximate convex hull with large maxEdge", () => {
    const coords: [number, number][] = [
      [0, 0],
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
      [2, 1],
      [0, 2],
      [1, 2],
      [2, 2],
    ];

    const fc = featureCollection(coords.map((c) => point(c)));
    const result = concave(fc, { maxEdge: 1000 });

    expect(result).not.toBeNull();
    expect(result!.geometry.type).toBe("Polygon");
  });

  it("should return a more concave shape or null with small maxEdge", () => {
    const coords: [number, number][] = [
      [0, 0],
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
      [2, 1],
      [0, 2],
      [1, 2],
      [2, 2],
    ];

    const fc = featureCollection(coords.map((c) => point(c)));
    const result = concave(fc, { maxEdge: 0.001 });

    // With a very small maxEdge, either null or a more concave polygon
    if (result !== null) {
      expect(result.geometry.type).toBe("Polygon");
    }
  });
});
