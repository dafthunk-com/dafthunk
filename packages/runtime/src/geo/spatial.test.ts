import { describe, expect, it } from "vitest";
import {
  nearestPoint,
  nearestPointOnLine,
  pointOnFeature,
  pointToLineDistance,
  pointToPolygonDistance,
  polygonTangents,
  centerMedian,
  polygonSmooth,
} from "./spatial";
import { point, featureCollection, lineString, polygon } from "./helpers";
import * as turf from "@turf/turf";

describe("nearestPoint", () => {
  it("should find the closest point and match turf index and distance", () => {
    const target = point([0, 0]);
    const pts = featureCollection([
      point([10, 10]),
      point([1, 1]),
      point([5, 5]),
      point([20, 20]),
      point([-3, -3]),
    ]);

    const result = nearestPoint(target, pts);
    const turfResult = turf.nearestPoint(
      turf.point([0, 0]),
      turf.featureCollection([
        turf.point([10, 10]),
        turf.point([1, 1]),
        turf.point([5, 5]),
        turf.point([20, 20]),
        turf.point([-3, -3]),
      ]),
    );

    expect(result.properties.featureIndex).toBe(turfResult.properties.featureIndex);
    expect(result.properties.distanceToPoint).toBeCloseTo(
      turfResult.properties.distanceToPoint,
      4,
    );
  });
});

describe("nearestPointOnLine", () => {
  it("should snap a point to the nearest location on a line and match turf", () => {
    const line = lineString([
      [0, 0],
      [10, 0],
      [10, 10],
    ]);
    const pt = point([5, 3]);

    const result = nearestPointOnLine(line, pt);
    const turfResult = turf.nearestPointOnLine(
      turf.lineString([
        [0, 0],
        [10, 0],
        [10, 10],
      ]),
      turf.point([5, 3]),
    );

    expect(result.geometry.coordinates[0]).toBeCloseTo(
      turfResult.geometry.coordinates[0],
      4,
    );
    expect(result.geometry.coordinates[1]).toBeCloseTo(
      turfResult.geometry.coordinates[1],
      4,
    );
  });
});

describe("pointOnFeature", () => {
  it("should return a valid point for a Polygon", () => {
    const poly = polygon([
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ],
    ]);

    const result = pointOnFeature(poly);
    expect(result.type).toBe("Feature");
    expect(result.geometry.type).toBe("Point");
    expect(result.geometry.coordinates).toHaveLength(2);
  });

  it("should return a valid point for a FeatureCollection", () => {
    const fc = featureCollection([point([1, 2]), point([3, 4])]);

    const result = pointOnFeature(fc);
    expect(result.type).toBe("Feature");
    expect(result.geometry.type).toBe("Point");
    expect(result.geometry.coordinates).toHaveLength(2);
  });
});

describe("pointToLineDistance", () => {
  it("should compute distance from a point to a line and match turf", () => {
    const pt = point([0, 1]);
    const line = lineString([
      [-10, 0],
      [10, 0],
    ]);

    const result = pointToLineDistance(pt, line);
    const turfResult = turf.pointToLineDistance(
      turf.point([0, 1]),
      turf.lineString([
        [-10, 0],
        [10, 0],
      ]),
    );

    expect(result).toBeCloseTo(turfResult, 2);
  });
});

describe("pointToPolygonDistance", () => {
  it("should return positive distance for a point outside the polygon", () => {
    const pt = point([15, 15]);
    const poly = polygon([
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ],
    ]);

    const result = pointToPolygonDistance(pt, poly);
    const turfResult = turf.pointToPolygonDistance(
      turf.point([15, 15]),
      turf.polygon([
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
          [0, 0],
        ],
      ]),
    );

    expect(result).toBeGreaterThan(0);
    expect(result).toBeCloseTo(turfResult, 2);
  });

  it("should return negative distance for a point inside the polygon", () => {
    const pt = point([5, 5]);
    const poly = polygon([
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ],
    ]);

    const result = pointToPolygonDistance(pt, poly);
    const turfResult = turf.pointToPolygonDistance(
      turf.point([5, 5]),
      turf.polygon([
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
          [0, 0],
        ],
      ]),
    );

    expect(result).toBeLessThan(0);
    expect(result).toBeCloseTo(turfResult, 2);
  });
});

describe("polygonTangents", () => {
  it("should return 2 tangent points for a point outside a polygon", () => {
    const pt = point([20, 20]);
    const poly = polygon([
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ],
    ]);

    const result = polygonTangents(pt, poly);
    expect(result.type).toBe("FeatureCollection");
    expect(result.features).toHaveLength(2);
    expect(result.features[0].geometry.type).toBe("Point");
    expect(result.features[1].geometry.type).toBe("Point");
  });
});

describe("centerMedian", () => {
  it("should compute the geometric median and be close to turf", () => {
    const pts = featureCollection([
      point([0, 0]),
      point([10, 0]),
      point([10, 10]),
      point([0, 10]),
      point([5, 5]),
    ]);

    const result = centerMedian(pts);
    const turfResult = turf.centerMedian(
      turf.featureCollection([
        turf.point([0, 0]),
        turf.point([10, 0]),
        turf.point([10, 10]),
        turf.point([0, 10]),
        turf.point([5, 5]),
      ]),
    );

    expect(result.geometry.coordinates[0]).toBeCloseTo(
      turfResult.geometry.coordinates[0],
      2,
    );
    expect(result.geometry.coordinates[1]).toBeCloseTo(
      turfResult.geometry.coordinates[1],
      2,
    );
  });
});

describe("polygonSmooth", () => {
  it("should produce more vertices after smoothing a simple square", () => {
    const square = polygon([
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ],
    ]);

    const result = polygonSmooth(square);
    const originalVertices = square.geometry.coordinates[0].length;
    const smoothedVertices = result.features[0].geometry.coordinates[0].length;

    expect(smoothedVertices).toBeGreaterThan(originalVertices);
  });

  it("should produce even more vertices with higher iterations", () => {
    const square = polygon([
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ],
    ]);

    const result1 = polygonSmooth(square, { iterations: 1 });
    const result2 = polygonSmooth(square, { iterations: 3 });

    const verts1 = result1.features[0].geometry.coordinates[0].length;
    const verts2 = result2.features[0].geometry.coordinates[0].length;

    expect(verts2).toBeGreaterThan(verts1);
  });
});
