import { describe, expect, it } from "vitest";
import {
  lineChunk,
  lineIntersect,
  lineOffset,
  lineOverlap,
  lineSegment,
  lineSlice,
  lineSliceAlong,
  lineSplit,
  lineToPolygon,
  polygonToLine,
} from "./line-operations";
import * as turf from "@turf/turf";

describe("lineSlice", () => {
  it("should slice a line between two points, matching turf", () => {
    const line = turf.lineString([
      [0, 0],
      [1, 1],
      [2, 0],
      [3, 1],
    ]);
    const start = turf.point([0.5, 0.5]);
    const stop = turf.point([2.5, 0.5]);

    const ours = lineSlice(start, stop, line);
    const theirs = turf.lineSlice(start, stop, line);

    expect(ours.geometry.coordinates.length).toBe(theirs.geometry.coordinates.length);
    for (let i = 0; i < ours.geometry.coordinates.length; i++) {
      expect(ours.geometry.coordinates[i][0]).toBeCloseTo(theirs.geometry.coordinates[i][0], 4);
      expect(ours.geometry.coordinates[i][1]).toBeCloseTo(theirs.geometry.coordinates[i][1], 4);
    }
  });
});

describe("lineSliceAlong", () => {
  it("should slice a line by distance in km, matching turf", () => {
    const line = turf.lineString([
      [0, 0],
      [0, 0.1],
      [0, 0.2],
      [0, 0.3],
    ]);
    const startDist = 5;
    const stopDist = 20;

    const ours = lineSliceAlong(line, startDist, stopDist, { units: "kilometers" });
    const theirs = turf.lineSliceAlong(line, startDist, stopDist, { units: "kilometers" });

    expect(ours.geometry.coordinates.length).toBe(theirs.geometry.coordinates.length);
    for (let i = 0; i < ours.geometry.coordinates.length; i++) {
      expect(ours.geometry.coordinates[i][0]).toBeCloseTo(theirs.geometry.coordinates[i][0], 4);
      expect(ours.geometry.coordinates[i][1]).toBeCloseTo(theirs.geometry.coordinates[i][1], 4);
    }
  });
});

describe("lineChunk", () => {
  it("should split a line into 10km chunks, with chunk count matching turf", () => {
    const line = turf.lineString([
      [0, 0],
      [0, 0.5],
      [0, 1],
    ]);
    const segmentLength = 10;

    const ours = lineChunk(line, segmentLength, { units: "kilometers" });
    const theirs = turf.lineChunk(line, segmentLength, { units: "kilometers" });

    expect(ours.features.length).toBe(theirs.features.length);
  });
});

describe("lineOffset", () => {
  it("should offset a line left and right, comparing with turf", () => {
    const line = turf.lineString([
      [0, 0],
      [1, 0],
      [2, 0],
    ]);
    const offsetDist = 0.5;

    const oursLeft = lineOffset(line, offsetDist, { units: "kilometers" });
    const theirsLeft = turf.lineOffset(line, offsetDist, { units: "kilometers" });

    for (let i = 0; i < oursLeft.geometry.coordinates.length; i++) {
      expect(oursLeft.geometry.coordinates[i][0]).toBeCloseTo(theirsLeft.geometry.coordinates[i][0], 4);
      expect(oursLeft.geometry.coordinates[i][1]).toBeCloseTo(theirsLeft.geometry.coordinates[i][1], 4);
    }

    const oursRight = lineOffset(line, -offsetDist, { units: "kilometers" });
    const theirsRight = turf.lineOffset(line, -offsetDist, { units: "kilometers" });

    for (let i = 0; i < oursRight.geometry.coordinates.length; i++) {
      expect(oursRight.geometry.coordinates[i][0]).toBeCloseTo(theirsRight.geometry.coordinates[i][0], 4);
      expect(oursRight.geometry.coordinates[i][1]).toBeCloseTo(theirsRight.geometry.coordinates[i][1], 4);
    }
  });
});

describe("lineSegment", () => {
  it("should segment a LineString, matching turf segment count", () => {
    const line = turf.lineString([
      [0, 0],
      [1, 1],
      [2, 0],
      [3, 1],
    ]);

    const ours = lineSegment(line);
    const theirs = turf.lineSegment(line);

    expect(ours.features.length).toBe(theirs.features.length);
  });

  it("should segment a Polygon, matching turf segment count", () => {
    const poly = turf.polygon([
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ],
    ]);

    const ours = lineSegment(poly);
    const theirs = turf.lineSegment(poly);

    expect(ours.features.length).toBe(theirs.features.length);
  });

  it("should segment a MultiLineString, matching turf segment count", () => {
    const multi: GeoJSON.Feature<GeoJSON.MultiLineString> = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "MultiLineString",
        coordinates: [
          [
            [0, 0],
            [1, 1],
            [2, 0],
          ],
          [
            [3, 3],
            [4, 4],
          ],
        ],
      },
    };

    const ours = lineSegment(multi as Parameters<typeof lineSegment>[0]);
    const theirs = turf.lineSegment(multi);

    expect(ours.features.length).toBe(theirs.features.length);
  });
});

describe("lineSplit", () => {
  it("should split a line at a point into two parts", () => {
    const line = turf.lineString([
      [0, 0],
      [1, 0],
      [2, 0],
    ]);
    const splitter = turf.point([1, 0]);

    const ours = lineSplit(line, splitter);

    expect(ours.features.length).toBe(2);
    // First part should end at or near [1,0], second should start there
    const firstEnd = ours.features[0].geometry.coordinates[ours.features[0].geometry.coordinates.length - 1];
    const secondStart = ours.features[1].geometry.coordinates[0];
    expect(firstEnd[0]).toBeCloseTo(1, 4);
    expect(firstEnd[1]).toBeCloseTo(0, 4);
    expect(secondStart[0]).toBeCloseTo(1, 4);
    expect(secondStart[1]).toBeCloseTo(0, 4);
  });
});

describe("lineOverlap", () => {
  it("should find overlapping segments between two overlapping lines", () => {
    const line1 = turf.lineString([
      [0, 0],
      [1, 0],
      [2, 0],
    ]);
    const line2 = turf.lineString([
      [1, 0],
      [2, 0],
      [3, 0],
    ]);

    const ours = lineOverlap(line1, line2);
    const theirs = turf.lineOverlap(line1, line2);

    expect(ours.features.length).toBeGreaterThan(0);
    expect(theirs.features.length).toBeGreaterThan(0);
  });

  it("should return no overlap for disjoint lines", () => {
    const line1 = turf.lineString([
      [0, 0],
      [1, 0],
    ]);
    const line2 = turf.lineString([
      [5, 5],
      [6, 5],
    ]);

    const ours = lineOverlap(line1, line2);
    const theirs = turf.lineOverlap(line1, line2);

    expect(ours.features.length).toBe(0);
    expect(theirs.features.length).toBe(0);
  });
});

describe("lineIntersect", () => {
  it("should find intersection points for two crossing lines (X shape)", () => {
    const line1 = turf.lineString([
      [0, 0],
      [2, 2],
    ]);
    const line2 = turf.lineString([
      [0, 2],
      [2, 0],
    ]);

    const ours = lineIntersect(line1, line2);
    const theirs = turf.lineIntersect(line1, line2);

    expect(ours.features.length).toBe(theirs.features.length);
    expect(ours.features.length).toBe(1);
    expect(ours.features[0].geometry.coordinates[0]).toBeCloseTo(theirs.features[0].geometry.coordinates[0], 4);
    expect(ours.features[0].geometry.coordinates[1]).toBeCloseTo(theirs.features[0].geometry.coordinates[1], 4);
  });

  it("should return no intersections for parallel lines", () => {
    const line1 = turf.lineString([
      [0, 0],
      [2, 0],
    ]);
    const line2 = turf.lineString([
      [0, 1],
      [2, 1],
    ]);

    const ours = lineIntersect(line1, line2);
    const theirs = turf.lineIntersect(line1, line2);

    expect(ours.features.length).toBe(0);
    expect(theirs.features.length).toBe(0);
  });
});

describe("lineToPolygon", () => {
  it("should convert a closed LineString to a Polygon", () => {
    const line = turf.lineString([
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ]);

    const ours = lineToPolygon(line);
    const theirs = turf.lineToPolygon(line);

    expect(ours.geometry.type).toBe("Polygon");
    expect(theirs.geometry.type).toBe("Polygon");

    const ourCoords = (ours.geometry as GeoJSON.Polygon).coordinates[0];
    const theirCoords = (theirs.geometry as GeoJSON.Polygon).coordinates[0];
    expect(ourCoords.length).toBe(theirCoords.length);
    for (let i = 0; i < ourCoords.length; i++) {
      expect(ourCoords[i][0]).toBeCloseTo(theirCoords[i][0], 4);
      expect(ourCoords[i][1]).toBeCloseTo(theirCoords[i][1], 4);
    }
  });

  it("should convert a MultiLineString to a MultiPolygon", () => {
    const multi: GeoJSON.Feature<GeoJSON.MultiLineString> = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "MultiLineString",
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
          [
            [2, 2],
            [3, 2],
            [3, 3],
            [2, 3],
            [2, 2],
          ],
        ],
      },
    };

    const ours = lineToPolygon(multi as Parameters<typeof lineToPolygon>[0]);
    const theirs = turf.lineToPolygon(multi);

    expect(ours.geometry.type).toBe(theirs.geometry.type);
  });
});

describe("polygonToLine", () => {
  it("should convert a Polygon to a LineString", () => {
    const poly = turf.polygon([
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ],
    ]);

    const ours = polygonToLine(poly);
    const theirs = turf.polygonToLine(poly);

    expect(ours.type).toBe("Feature");
    expect((ours as GeoJSON.Feature).geometry.type).toBe("LineString");
    expect((theirs as GeoJSON.Feature).geometry.type).toBe("LineString");

    const ourCoords = ((ours as GeoJSON.Feature).geometry as GeoJSON.LineString).coordinates;
    const theirCoords = ((theirs as GeoJSON.Feature).geometry as GeoJSON.LineString).coordinates;
    expect(ourCoords.length).toBe(theirCoords.length);
    for (let i = 0; i < ourCoords.length; i++) {
      expect(ourCoords[i][0]).toBeCloseTo(theirCoords[i][0], 4);
      expect(ourCoords[i][1]).toBeCloseTo(theirCoords[i][1], 4);
    }
  });

  it("should convert a Polygon with holes to multiple LineStrings", () => {
    const poly = turf.polygon([
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ],
      [
        [2, 2],
        [8, 2],
        [8, 8],
        [2, 8],
        [2, 2],
      ],
    ]);

    const ours = polygonToLine(poly);
    const theirs = turf.polygonToLine(poly);

    // Both should produce a FeatureCollection with 2 LineStrings
    expect(ours.type).toBe("FeatureCollection");
    expect(theirs.type).toBe("FeatureCollection");
    expect((ours as GeoJSON.FeatureCollection).features.length).toBe(
      (theirs as GeoJSON.FeatureCollection).features.length,
    );
  });
});
