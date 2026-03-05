import * as turf from "@turf/turf";
import { describe, expect, it } from "vitest";
import {
  booleanClockwise,
  booleanConcave,
  booleanContains,
  booleanCrosses,
  booleanDisjoint,
  booleanEqual,
  booleanIntersects,
  booleanOverlap,
  booleanParallel,
  booleanPointInPolygon,
  booleanPointOnLine,
  booleanTouches,
  booleanValid,
  booleanWithin,
} from "./booleans";

describe("booleanClockwise", () => {
  it("should return true for a clockwise ring", () => {
    const ring = turf.lineString([
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
      [0, 0],
    ]);

    const ours = booleanClockwise(ring);
    const theirs = turf.booleanClockwise(ring);

    expect(ours).toBe(theirs);
    expect(ours).toBe(true);
  });

  it("should return false for a counter-clockwise ring", () => {
    const ring = turf.lineString([
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ]);

    const ours = booleanClockwise(ring);
    const theirs = turf.booleanClockwise(ring);

    expect(ours).toBe(theirs);
    expect(ours).toBe(false);
  });
});

describe("booleanConcave", () => {
  it("should return false for a convex polygon", () => {
    const poly = turf.polygon([
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ],
    ]);

    const ours = booleanConcave(poly);
    const theirs = turf.booleanConcave(poly);

    expect(ours).toBe(theirs);
    expect(ours).toBe(false);
  });

  it("should return true for a concave polygon", () => {
    const poly = turf.polygon([
      [
        [0, 0],
        [2, 0],
        [2, 2],
        [1, 1],
        [0, 2],
        [0, 0],
      ],
    ]);

    const ours = booleanConcave(poly);
    const theirs = turf.booleanConcave(poly);

    expect(ours).toBe(theirs);
    expect(ours).toBe(true);
  });
});

describe("booleanContains", () => {
  it("should return true when point is inside polygon", () => {
    const poly = turf.polygon([
      [
        [0, 0],
        [2, 0],
        [2, 2],
        [0, 2],
        [0, 0],
      ],
    ]);
    const pt = turf.point([1, 1]);

    const ours = booleanContains(poly, pt);
    const theirs = turf.booleanContains(poly, pt);

    expect(ours).toBe(theirs);
    expect(ours).toBe(true);
  });

  it("should return false when point is outside polygon", () => {
    const poly = turf.polygon([
      [
        [0, 0],
        [2, 0],
        [2, 2],
        [0, 2],
        [0, 0],
      ],
    ]);
    const pt = turf.point([5, 5]);

    const ours = booleanContains(poly, pt);
    const theirs = turf.booleanContains(poly, pt);

    expect(ours).toBe(theirs);
    expect(ours).toBe(false);
  });

  it("should return true when polygon contains another polygon", () => {
    const outer = turf.polygon([
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ],
    ]);
    const inner = turf.polygon([
      [
        [1, 1],
        [5, 1],
        [5, 5],
        [1, 5],
        [1, 1],
      ],
    ]);

    const ours = booleanContains(outer, inner);
    const theirs = turf.booleanContains(outer, inner);

    expect(ours).toBe(theirs);
    expect(ours).toBe(true);
  });
});

describe("booleanCrosses", () => {
  it("should return true for two crossing lines", () => {
    const line1 = turf.lineString([
      [0, 0],
      [2, 2],
    ]);
    const line2 = turf.lineString([
      [0, 2],
      [2, 0],
    ]);

    const ours = booleanCrosses(line1, line2);
    const theirs = turf.booleanCrosses(line1, line2);

    expect(ours).toBe(theirs);
    expect(ours).toBe(true);
  });

  it("should return false for parallel lines", () => {
    const line1 = turf.lineString([
      [0, 0],
      [2, 0],
    ]);
    const line2 = turf.lineString([
      [0, 1],
      [2, 1],
    ]);

    const ours = booleanCrosses(line1, line2);
    const theirs = turf.booleanCrosses(line1, line2);

    expect(ours).toBe(theirs);
    expect(ours).toBe(false);
  });

  it("should return true for a line crossing polygon boundary", () => {
    const line = turf.lineString([
      [-1, 1],
      [3, 1],
    ]);
    const poly = turf.polygon([
      [
        [0, 0],
        [2, 0],
        [2, 2],
        [0, 2],
        [0, 0],
      ],
    ]);

    const ours = booleanCrosses(line, poly);
    const theirs = turf.booleanCrosses(line, poly);

    expect(ours).toBe(theirs);
    expect(ours).toBe(true);
  });
});

describe("booleanDisjoint", () => {
  it("should return true for disjoint polygons", () => {
    const poly1 = turf.polygon([
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ],
    ]);
    const poly2 = turf.polygon([
      [
        [5, 5],
        [6, 5],
        [6, 6],
        [5, 6],
        [5, 5],
      ],
    ]);

    const ours = booleanDisjoint(poly1, poly2);
    const theirs = turf.booleanDisjoint(poly1, poly2);

    expect(ours).toBe(theirs);
    expect(ours).toBe(true);
  });

  it("should return false for overlapping polygons", () => {
    const poly1 = turf.polygon([
      [
        [0, 0],
        [2, 0],
        [2, 2],
        [0, 2],
        [0, 0],
      ],
    ]);
    const poly2 = turf.polygon([
      [
        [1, 1],
        [3, 1],
        [3, 3],
        [1, 3],
        [1, 1],
      ],
    ]);

    const ours = booleanDisjoint(poly1, poly2);
    const theirs = turf.booleanDisjoint(poly1, poly2);

    expect(ours).toBe(theirs);
    expect(ours).toBe(false);
  });
});

describe("booleanEqual", () => {
  it("should return true for identical geometries", () => {
    const poly1 = turf.polygon([
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ],
    ]);
    const poly2 = turf.polygon([
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ],
    ]);

    const ours = booleanEqual(poly1, poly2);
    const theirs = turf.booleanEqual(poly1, poly2);

    expect(ours).toBe(theirs);
    expect(ours).toBe(true);
  });

  it("should return false for different geometries", () => {
    const poly1 = turf.polygon([
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ],
    ]);
    const poly2 = turf.polygon([
      [
        [0, 0],
        [2, 0],
        [2, 2],
        [0, 2],
        [0, 0],
      ],
    ]);

    const ours = booleanEqual(poly1, poly2);
    const theirs = turf.booleanEqual(poly1, poly2);

    expect(ours).toBe(theirs);
    expect(ours).toBe(false);
  });
});

describe("booleanIntersects", () => {
  it("should return true for overlapping polygons", () => {
    const poly1 = turf.polygon([
      [
        [0, 0],
        [2, 0],
        [2, 2],
        [0, 2],
        [0, 0],
      ],
    ]);
    const poly2 = turf.polygon([
      [
        [1, 1],
        [3, 1],
        [3, 3],
        [1, 3],
        [1, 1],
      ],
    ]);

    const ours = booleanIntersects(poly1, poly2);
    const theirs = turf.booleanIntersects(poly1, poly2);

    expect(ours).toBe(theirs);
    expect(ours).toBe(true);
  });

  it("should return false for disjoint polygons", () => {
    const poly1 = turf.polygon([
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ],
    ]);
    const poly2 = turf.polygon([
      [
        [5, 5],
        [6, 5],
        [6, 6],
        [5, 6],
        [5, 5],
      ],
    ]);

    const ours = booleanIntersects(poly1, poly2);
    const theirs = turf.booleanIntersects(poly1, poly2);

    expect(ours).toBe(theirs);
    expect(ours).toBe(false);
  });

  it("should return true for point on polygon boundary", () => {
    const pt = turf.point([0, 0]);
    const poly = turf.polygon([
      [
        [0, 0],
        [2, 0],
        [2, 2],
        [0, 2],
        [0, 0],
      ],
    ]);

    const ours = booleanIntersects(pt, poly);
    const theirs = turf.booleanIntersects(pt, poly);

    expect(ours).toBe(theirs);
    expect(ours).toBe(true);
  });

  it("should return true for line intersecting polygon", () => {
    const line = turf.lineString([
      [-1, 1],
      [3, 1],
    ]);
    const poly = turf.polygon([
      [
        [0, 0],
        [2, 0],
        [2, 2],
        [0, 2],
        [0, 0],
      ],
    ]);

    const ours = booleanIntersects(line, poly);
    const theirs = turf.booleanIntersects(line, poly);

    expect(ours).toBe(theirs);
    expect(ours).toBe(true);
  });
});

describe("booleanOverlap", () => {
  it("should return true for partially overlapping polygons", () => {
    const poly1 = turf.polygon([
      [
        [0, 0],
        [2, 0],
        [2, 2],
        [0, 2],
        [0, 0],
      ],
    ]);
    const poly2 = turf.polygon([
      [
        [1, 1],
        [3, 1],
        [3, 3],
        [1, 3],
        [1, 1],
      ],
    ]);

    const ours = booleanOverlap(poly1, poly2);
    const theirs = turf.booleanOverlap(poly1, poly2);

    expect(ours).toBe(theirs);
    expect(ours).toBe(true);
  });

  it("should return false when one polygon is fully contained in another", () => {
    const outer = turf.polygon([
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ],
    ]);
    const inner = turf.polygon([
      [
        [1, 1],
        [2, 1],
        [2, 2],
        [1, 2],
        [1, 1],
      ],
    ]);

    const ours = booleanOverlap(outer, inner);
    const theirs = turf.booleanOverlap(outer, inner);

    expect(ours).toBe(theirs);
    expect(ours).toBe(false);
  });
});

describe("booleanParallel", () => {
  it("should return true for parallel lines", () => {
    const line1 = turf.lineString([
      [0, 0],
      [2, 0],
    ]);
    const line2 = turf.lineString([
      [0, 1],
      [2, 1],
    ]);

    const ours = booleanParallel(line1, line2);
    const theirs = turf.booleanParallel(line1, line2);

    expect(ours).toBe(theirs);
    expect(ours).toBe(true);
  });

  it("should return false for crossing lines", () => {
    const line1 = turf.lineString([
      [0, 0],
      [2, 2],
    ]);
    const line2 = turf.lineString([
      [0, 2],
      [2, 0],
    ]);

    const ours = booleanParallel(line1, line2);
    const theirs = turf.booleanParallel(line1, line2);

    expect(ours).toBe(theirs);
    expect(ours).toBe(false);
  });
});

describe("booleanPointInPolygon", () => {
  it("should return true for point inside polygon", () => {
    const pt = turf.point([1, 1]);
    const poly = turf.polygon([
      [
        [0, 0],
        [2, 0],
        [2, 2],
        [0, 2],
        [0, 0],
      ],
    ]);

    const ours = booleanPointInPolygon(pt, poly);
    const theirs = turf.booleanPointInPolygon(pt, poly);

    expect(ours).toBe(theirs);
    expect(ours).toBe(true);
  });

  it("should return false for point outside polygon", () => {
    const pt = turf.point([5, 5]);
    const poly = turf.polygon([
      [
        [0, 0],
        [2, 0],
        [2, 2],
        [0, 2],
        [0, 0],
      ],
    ]);

    const ours = booleanPointInPolygon(pt, poly);
    const theirs = turf.booleanPointInPolygon(pt, poly);

    expect(ours).toBe(theirs);
    expect(ours).toBe(false);
  });

  it("should return true for point on boundary (default)", () => {
    const pt = turf.point([0, 0]);
    const poly = turf.polygon([
      [
        [0, 0],
        [2, 0],
        [2, 2],
        [0, 2],
        [0, 0],
      ],
    ]);

    const ours = booleanPointInPolygon(pt, poly);
    const theirs = turf.booleanPointInPolygon(pt, poly);

    expect(ours).toBe(theirs);
    expect(ours).toBe(true);
  });

  it("should handle polygon with holes", () => {
    const pt = turf.point([5, 5]);
    const poly = turf.polygon([
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ],
      [
        [3, 3],
        [7, 3],
        [7, 7],
        [3, 7],
        [3, 3],
      ],
    ]);

    const ours = booleanPointInPolygon(pt, poly);
    const theirs = turf.booleanPointInPolygon(pt, poly);

    expect(ours).toBe(theirs);
    expect(ours).toBe(false);
  });

  it("should handle MultiPolygon", () => {
    const pt = turf.point([1, 1]);
    const multiPoly: GeoJSON.Feature<GeoJSON.MultiPolygon> = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [0, 0],
              [2, 0],
              [2, 2],
              [0, 2],
              [0, 0],
            ],
          ],
          [
            [
              [5, 5],
              [7, 5],
              [7, 7],
              [5, 7],
              [5, 5],
            ],
          ],
        ],
      },
    };

    const ours = booleanPointInPolygon(
      pt,
      multiPoly as Parameters<typeof booleanPointInPolygon>[1]
    );
    const theirs = turf.booleanPointInPolygon(pt, multiPoly);

    expect(ours).toBe(theirs);
    expect(ours).toBe(true);
  });

  it("should respect ignoreBoundary option", () => {
    const pt = turf.point([0, 0]);
    const poly = turf.polygon([
      [
        [0, 0],
        [2, 0],
        [2, 2],
        [0, 2],
        [0, 0],
      ],
    ]);

    const ours = booleanPointInPolygon(pt, poly, { ignoreBoundary: true });
    const theirs = turf.booleanPointInPolygon(pt, poly, {
      ignoreBoundary: true,
    });

    expect(ours).toBe(theirs);
    expect(ours).toBe(false);
  });
});

describe("booleanPointOnLine", () => {
  it("should return true for point on line", () => {
    const pt = turf.point([1, 1]);
    const line = turf.lineString([
      [0, 0],
      [2, 2],
    ]);

    const ours = booleanPointOnLine(pt, line);
    const theirs = turf.booleanPointOnLine(pt, line);

    expect(ours).toBe(theirs);
    expect(ours).toBe(true);
  });

  it("should return false for point off line", () => {
    const pt = turf.point([3, 0]);
    const line = turf.lineString([
      [0, 0],
      [2, 2],
    ]);

    const ours = booleanPointOnLine(pt, line);
    const theirs = turf.booleanPointOnLine(pt, line);

    expect(ours).toBe(theirs);
    expect(ours).toBe(false);
  });

  it("should respect ignoreEndVertices option", () => {
    const pt = turf.point([0, 0]);
    const line = turf.lineString([
      [0, 0],
      [2, 2],
    ]);

    const ours = booleanPointOnLine(pt, line, { ignoreEndVertices: true });
    const theirs = turf.booleanPointOnLine(pt, line, {
      ignoreEndVertices: true,
    });

    expect(ours).toBe(theirs);
    expect(ours).toBe(false);
  });
});

describe("booleanTouches", () => {
  it("should return true when point is on polygon boundary", () => {
    const pt = turf.point([0, 1]);
    const poly = turf.polygon([
      [
        [0, 0],
        [2, 0],
        [2, 2],
        [0, 2],
        [0, 0],
      ],
    ]);

    const ours = booleanTouches(pt, poly);
    const theirs = turf.booleanTouches(pt, poly);

    expect(ours).toBe(theirs);
    expect(ours).toBe(true);
  });

  it("should return false when point is inside polygon", () => {
    const pt = turf.point([1, 1]);
    const poly = turf.polygon([
      [
        [0, 0],
        [2, 0],
        [2, 2],
        [0, 2],
        [0, 0],
      ],
    ]);

    const ours = booleanTouches(pt, poly);
    const theirs = turf.booleanTouches(pt, poly);

    expect(ours).toBe(theirs);
    expect(ours).toBe(false);
  });
});

describe("booleanValid", () => {
  it("should return true for a valid Point", () => {
    const pt: GeoJSON.Point = { type: "Point", coordinates: [1, 2] };

    const ours = booleanValid(pt);
    const theirs = turf.booleanValid(pt);

    expect(ours).toBe(theirs);
    expect(ours).toBe(true);
  });

  it("should return true for a valid Polygon", () => {
    const poly: GeoJSON.Polygon = {
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
    };

    const ours = booleanValid(poly);
    const theirs = turf.booleanValid(poly);

    expect(ours).toBe(theirs);
    expect(ours).toBe(true);
  });

  it("should return false for an unclosed polygon", () => {
    const poly: GeoJSON.Polygon = {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
        ],
      ],
    };

    const ours = booleanValid(poly);
    const theirs = turf.booleanValid(poly);

    expect(ours).toBe(theirs);
    expect(ours).toBe(false);
  });

  it("should return false for a LineString with fewer than 2 coordinates", () => {
    const line: GeoJSON.LineString = {
      type: "LineString",
      coordinates: [[0, 0]],
    };

    const ours = booleanValid(line);
    const theirs = turf.booleanValid(line);

    expect(ours).toBe(theirs);
    expect(ours).toBe(false);
  });
});

describe("booleanWithin", () => {
  it("should return true when point is within polygon", () => {
    const pt = turf.point([1, 1]);
    const poly = turf.polygon([
      [
        [0, 0],
        [2, 0],
        [2, 2],
        [0, 2],
        [0, 0],
      ],
    ]);

    const ours = booleanWithin(pt, poly);
    const theirs = turf.booleanWithin(pt, poly);

    expect(ours).toBe(theirs);
    expect(ours).toBe(true);
  });

  it("should return false when point is outside polygon", () => {
    const pt = turf.point([5, 5]);
    const poly = turf.polygon([
      [
        [0, 0],
        [2, 0],
        [2, 2],
        [0, 2],
        [0, 0],
      ],
    ]);

    const ours = booleanWithin(pt, poly);
    const theirs = turf.booleanWithin(pt, poly);

    expect(ours).toBe(theirs);
    expect(ours).toBe(false);
  });
});
