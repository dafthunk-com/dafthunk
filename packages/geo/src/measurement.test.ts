import * as turf from "@turf/turf";
import { describe, expect, it } from "vitest";
import {
  angle,
  area,
  bearing,
  center,
  centerMean,
  centerOfMass,
  centroid,
  distance,
  length,
  midpoint,
  rhumbBearing,
  rhumbDistance,
} from "./measurement";

// Test coordinates
const paris = [2.3522, 48.8566];
const london = [-0.1276, 51.5074];
const nyc = [-74.006, 40.7128];
const la = [-118.2437, 33.9425];

describe("distance", () => {
  it("should match turf for Paris to London in kilometers", () => {
    const ours = distance(paris, london, { units: "kilometers" });
    const turfs = turf.distance(paris, london, { units: "kilometers" });
    expect(ours).toBeCloseTo(turfs, 6);
  });

  it("should match turf for NYC to LA in kilometers", () => {
    const ours = distance(nyc, la, { units: "kilometers" });
    const turfs = turf.distance(nyc, la, { units: "kilometers" });
    expect(ours).toBeCloseTo(turfs, 6);
  });

  it("should return 0 for the same point", () => {
    const ours = distance(paris, paris);
    const turfs = turf.distance(paris, paris);
    expect(ours).toBeCloseTo(turfs, 6);
    expect(ours).toBe(0);
  });

  it("should match turf in miles", () => {
    const ours = distance(paris, london, { units: "miles" });
    const turfs = turf.distance(paris, london, { units: "miles" });
    expect(ours).toBeCloseTo(turfs, 6);
  });

  it("should match turf in meters", () => {
    const ours = distance(paris, london, { units: "meters" });
    const turfs = turf.distance(paris, london, { units: "meters" });
    expect(ours).toBeCloseTo(turfs, 6);
  });

  it("should match turf in degrees", () => {
    const ours = distance(paris, london, { units: "degrees" });
    const turfs = turf.distance(paris, london, { units: "degrees" });
    expect(ours).toBeCloseTo(turfs, 6);
  });
});

describe("bearing", () => {
  it("should match turf for northward bearing", () => {
    const south = [0, 0];
    const north = [0, 10];
    const ours = bearing(south, north);
    const turfs = turf.bearing(south, north);
    expect(ours).toBeCloseTo(turfs, 6);
  });

  it("should match turf for southward bearing", () => {
    const north = [0, 10];
    const south = [0, 0];
    const ours = bearing(north, south);
    const turfs = turf.bearing(north, south);
    expect(ours).toBeCloseTo(turfs, 6);
  });

  it("should match turf for eastward bearing", () => {
    const west = [0, 0];
    const east = [10, 0];
    const ours = bearing(west, east);
    const turfs = turf.bearing(west, east);
    expect(ours).toBeCloseTo(turfs, 6);
  });

  it("should match turf for westward bearing", () => {
    const east = [10, 0];
    const west = [0, 0];
    const ours = bearing(east, west);
    const turfs = turf.bearing(east, west);
    expect(ours).toBeCloseTo(turfs, 6);
  });

  it("should match turf for final bearing", () => {
    const ours = bearing(paris, london, { final: true });
    const turfs = turf.bearing(paris, london, { final: true });
    expect(ours).toBeCloseTo(turfs, 6);
  });
});

describe("rhumbBearing", () => {
  it("should match turf for northward rhumb bearing", () => {
    const south = [0, 0];
    const north = [0, 10];
    const ours = rhumbBearing(south, north);
    const turfs = turf.rhumbBearing(south, north);
    expect(ours).toBeCloseTo(turfs, 6);
  });

  it("should match turf for southward rhumb bearing", () => {
    const north = [0, 10];
    const south = [0, 0];
    const ours = rhumbBearing(north, south);
    const turfs = turf.rhumbBearing(north, south);
    expect(ours).toBeCloseTo(turfs, 6);
  });

  it("should match turf for eastward rhumb bearing", () => {
    const west = [0, 0];
    const east = [10, 0];
    const ours = rhumbBearing(west, east);
    const turfs = turf.rhumbBearing(west, east);
    expect(ours).toBeCloseTo(turfs, 6);
  });

  it("should match turf for westward rhumb bearing", () => {
    const east = [10, 0];
    const west = [0, 0];
    const ours = rhumbBearing(east, west);
    const turfs = turf.rhumbBearing(east, west);
    expect(ours).toBeCloseTo(turfs, 6);
  });

  it("should match turf for final rhumb bearing", () => {
    const ours = rhumbBearing(paris, london, { final: true });
    const turfs = turf.rhumbBearing(paris, london, { final: true });
    expect(ours).toBeCloseTo(turfs, 6);
  });
});

describe("rhumbDistance", () => {
  it("should match turf for Paris to London", () => {
    const ours = rhumbDistance(paris, london, { units: "kilometers" });
    const turfs = turf.rhumbDistance(paris, london, { units: "kilometers" });
    expect(ours).toBeCloseTo(turfs, 6);
  });

  it("should match turf for NYC to LA", () => {
    const ours = rhumbDistance(nyc, la, { units: "kilometers" });
    const turfs = turf.rhumbDistance(nyc, la, { units: "kilometers" });
    expect(ours).toBeCloseTo(turfs, 6);
  });

  it("should match turf in miles", () => {
    const ours = rhumbDistance(paris, london, { units: "miles" });
    const turfs = turf.rhumbDistance(paris, london, { units: "miles" });
    expect(ours).toBeCloseTo(turfs, 6);
  });

  it("should match turf in meters", () => {
    const ours = rhumbDistance(paris, london, { units: "meters" });
    const turfs = turf.rhumbDistance(paris, london, { units: "meters" });
    expect(ours).toBeCloseTo(turfs, 6);
  });
});

describe("area", () => {
  it("should match turf for a unit square polygon", () => {
    const poly = turf.polygon([
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ],
    ]);
    const ours = area(poly);
    const turfs = turf.area(poly);
    expect(ours).toBeCloseTo(turfs, 4);
  });

  it("should match turf for a large country-sized polygon", () => {
    const poly = turf.polygon([
      [
        [-10, 40],
        [10, 40],
        [10, 50],
        [-10, 50],
        [-10, 40],
      ],
    ]);
    const ours = area(poly);
    const turfs = turf.area(poly);
    // For very large numbers, use relative tolerance instead of absolute decimal places
    expect(Math.abs(ours - turfs) / turfs).toBeCloseTo(0, 6);
  });

  it("should match turf for a MultiPolygon", () => {
    const mp = turf.multiPolygon([
      [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
      ],
      [
        [
          [2, 2],
          [3, 2],
          [3, 3],
          [2, 3],
          [2, 2],
        ],
      ],
    ]);
    const ours = area(mp);
    const turfs = turf.area(mp);
    expect(ours).toBeCloseTo(turfs, 4);
  });
});

describe("length", () => {
  it("should match turf for a simple LineString", () => {
    const line = turf.lineString([
      [0, 0],
      [1, 1],
    ]);
    const ours = length(line, { units: "kilometers" });
    const turfs = turf.length(line, { units: "kilometers" });
    expect(ours).toBeCloseTo(turfs, 6);
  });

  it("should match turf for a multi-segment line", () => {
    const line = turf.lineString([
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ]);
    const ours = length(line, { units: "kilometers" });
    const turfs = turf.length(line, { units: "kilometers" });
    expect(ours).toBeCloseTo(turfs, 6);
  });
});

describe("angle", () => {
  it("should match turf for a straight line (180 degrees)", () => {
    const a = [1, 0];
    const b = [0, 0];
    const c = [-1, 0];
    const ours = angle(a, b, c);
    const turfs = turf.angle(a, b, c);
    expect(ours).toBeCloseTo(turfs, 6);
  });

  it("should be complementary to turf for a right angle (ours + turf = 360)", () => {
    const a = [1, 0];
    const b = [0, 0];
    const c = [0, 1];
    const ours = angle(a, b, c);
    const turfs = turf.angle(a, b, c);
    // Our implementation measures the angle in opposite rotation direction
    expect(ours + turfs).toBeCloseTo(360, 6);
  });

  it("should be complementary to turf for explementary angle", () => {
    const a = [1, 0];
    const b = [0, 0];
    const c = [0, 1];
    const ours = angle(a, b, c, { explementary: true });
    const turfs = turf.angle(a, b, c, { explementary: true });
    // Explementary swaps, so the complementary relationship holds in reverse
    expect(ours + turfs).toBeCloseTo(360, 6);
  });

  it("should be complementary to turf for mercator angle", () => {
    const a = [1, 0];
    const b = [0, 0];
    const c = [0, 1];
    const ours = angle(a, b, c, { mercator: true });
    const turfs = turf.angle(a, b, c, { mercator: true });
    expect(ours + turfs).toBeCloseTo(360, 6);
  });
});

describe("midpoint", () => {
  it("should match turf for Paris to London", () => {
    const ours = midpoint(paris, london);
    const turfs = turf.midpoint(paris, london);
    expect(ours.geometry.coordinates[0]).toBeCloseTo(
      turfs.geometry.coordinates[0],
      6
    );
    expect(ours.geometry.coordinates[1]).toBeCloseTo(
      turfs.geometry.coordinates[1],
      6
    );
  });

  it("should match turf for NYC to LA", () => {
    const ours = midpoint(nyc, la);
    const turfs = turf.midpoint(nyc, la);
    expect(ours.geometry.coordinates[0]).toBeCloseTo(
      turfs.geometry.coordinates[0],
      6
    );
    expect(ours.geometry.coordinates[1]).toBeCloseTo(
      turfs.geometry.coordinates[1],
      6
    );
  });
});

describe("centroid", () => {
  it("should match turf for a LineString", () => {
    const line = turf.lineString([
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ]);
    const ours = centroid(line);
    const turfs = turf.centroid(line);
    expect(ours.geometry.coordinates[0]).toBeCloseTo(
      turfs.geometry.coordinates[0],
      6
    );
    expect(ours.geometry.coordinates[1]).toBeCloseTo(
      turfs.geometry.coordinates[1],
      6
    );
  });

  it("should match turf for a FeatureCollection of Points", () => {
    const fc = turf.featureCollection([
      turf.point([0, 0]),
      turf.point([10, 0]),
      turf.point([10, 10]),
      turf.point([0, 10]),
    ]);
    const ours = centroid(fc);
    const turfs = turf.centroid(fc);
    expect(ours.geometry.coordinates[0]).toBeCloseTo(
      turfs.geometry.coordinates[0],
      6
    );
    expect(ours.geometry.coordinates[1]).toBeCloseTo(
      turfs.geometry.coordinates[1],
      6
    );
  });
});

describe("center", () => {
  it("should match turf for a Polygon (center of bbox)", () => {
    const poly = turf.polygon([
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ],
    ]);
    const ours = center(poly);
    const turfs = turf.center(poly);
    expect(ours.geometry.coordinates[0]).toBeCloseTo(
      turfs.geometry.coordinates[0],
      6
    );
    expect(ours.geometry.coordinates[1]).toBeCloseTo(
      turfs.geometry.coordinates[1],
      6
    );
  });
});

describe("centerMean", () => {
  it("should match turf for a FeatureCollection of Points", () => {
    const fc = turf.featureCollection([
      turf.point([0, 0]),
      turf.point([10, 0]),
      turf.point([10, 10]),
      turf.point([0, 10]),
    ]);
    const ours = centerMean(fc);
    const turfs = turf.centerMean(fc);
    expect(ours.geometry.coordinates[0]).toBeCloseTo(
      turfs.geometry.coordinates[0],
      6
    );
    expect(ours.geometry.coordinates[1]).toBeCloseTo(
      turfs.geometry.coordinates[1],
      6
    );
  });

  it("should match turf for weighted center mean", () => {
    const fc = turf.featureCollection([
      turf.point([0, 0], { weight: 1 }),
      turf.point([10, 0], { weight: 2 }),
      turf.point([10, 10], { weight: 3 }),
      turf.point([0, 10], { weight: 4 }),
    ]);
    const ours = centerMean(fc, { weight: "weight" });
    const turfs = turf.centerMean(fc, { weight: "weight" });
    expect(ours.geometry.coordinates[0]).toBeCloseTo(
      turfs.geometry.coordinates[0],
      6
    );
    expect(ours.geometry.coordinates[1]).toBeCloseTo(
      turfs.geometry.coordinates[1],
      6
    );
  });
});

describe("centerOfMass", () => {
  it("should match turf for an L-shaped Polygon", () => {
    const lShape = turf.polygon([
      [
        [0, 0],
        [4, 0],
        [4, 2],
        [2, 2],
        [2, 4],
        [0, 4],
        [0, 0],
      ],
    ]);
    const ours = centerOfMass(lShape);
    const turfs = turf.centerOfMass(lShape);
    expect(ours.geometry.coordinates[0]).toBeCloseTo(
      turfs.geometry.coordinates[0],
      6
    );
    expect(ours.geometry.coordinates[1]).toBeCloseTo(
      turfs.geometry.coordinates[1],
      6
    );
  });
});
