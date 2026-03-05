import { describe, expect, it } from "vitest";
import {
  along,
  bboxPolygon,
  buffer,
  circle,
  destination,
  envelope,
  greatCircle,
  lineArc,
  rhumbDestination,
  sector,
  square,
} from "./geometry";
import * as turf from "@turf/turf";

describe("bboxPolygon", () => {
  it("creates a polygon from a standard bbox", () => {
    const bb: [number, number, number, number] = [-10, -10, 10, 10];
    const ours = bboxPolygon(bb);
    const theirs = turf.bboxPolygon(bb);
    expect(ours.geometry.coordinates).toEqual(theirs.geometry.coordinates);
  });

  it("creates a polygon with properties", () => {
    const bb: [number, number, number, number] = [0, 0, 1, 1];
    const props = { name: "test" };
    const ours = bboxPolygon(bb, { properties: props });
    const theirs = turf.bboxPolygon(bb, { properties: props });
    expect(ours.geometry.coordinates).toEqual(theirs.geometry.coordinates);
    expect(ours.properties).toEqual(theirs.properties);
  });
});

describe("envelope", () => {
  it("computes envelope of a FeatureCollection", () => {
    const fc = turf.featureCollection([
      turf.point([-10, -10]),
      turf.point([10, 10]),
      turf.point([5, 0]),
    ]);
    const ours = envelope(fc as GeoJSON.FeatureCollection);
    const theirs = turf.envelope(fc);
    expect(ours.geometry.coordinates).toEqual(theirs.geometry.coordinates);
  });
});

describe("square", () => {
  it("squares a rectangular bbox", () => {
    const bb: [number, number, number, number] = [0, 0, 10, 5];
    const ours = square(bb);
    const theirs = turf.square(bb);
    expect(ours[0]).toBeCloseTo(theirs[0], 6);
    expect(ours[1]).toBeCloseTo(theirs[1], 6);
    expect(ours[2]).toBeCloseTo(theirs[2], 6);
    expect(ours[3]).toBeCloseTo(theirs[3], 6);
  });

  it("returns same bbox if already square", () => {
    const bb: [number, number, number, number] = [0, 0, 10, 10];
    const ours = square(bb);
    const theirs = turf.square(bb);
    expect(ours).toEqual(theirs);
  });
});

describe("circle", () => {
  it("creates a circle polygon with correct vertex count", () => {
    const center = [0, 0];
    const radius = 50;
    const steps = 32;
    const ours = circle(center, radius, { steps, units: "kilometers" });
    const theirs = turf.circle(center, radius, {
      steps,
      units: "kilometers",
    });
    const ourRing = ours.geometry.coordinates[0];
    const theirRing = theirs.geometry.coordinates[0];
    // Should be a closed polygon with steps + 1 coordinates
    expect(ourRing.length).toBe(steps + 1);
    expect(ourRing.length).toBe(theirRing.length);
    // First and last should be the same (closed)
    expect(ourRing[0][0]).toBeCloseTo(ourRing[ourRing.length - 1][0], 6);
    expect(ourRing[0][1]).toBeCloseTo(ourRing[ourRing.length - 1][1], 6);
  });

  it("matches turf coordinates", () => {
    const center = [10, 20];
    const radius = 100;
    const steps = 16;
    const ours = circle(center, radius, { steps, units: "kilometers" });
    const theirs = turf.circle(center, radius, {
      steps,
      units: "kilometers",
    });
    const ourRing = ours.geometry.coordinates[0];
    const theirRing = theirs.geometry.coordinates[0];
    for (let i = 0; i < Math.min(5, ourRing.length); i++) {
      expect(ourRing[i][0]).toBeCloseTo(theirRing[i][0], 4);
      expect(ourRing[i][1]).toBeCloseTo(theirRing[i][1], 4);
    }
  });
});

describe("sector", () => {
  it("creates a closed sector polygon", () => {
    const center = [0, 0];
    const radius = 50;
    const bearing1 = 0;
    const bearing2 = 90;
    const ours = sector(center, radius, bearing1, bearing2, {
      units: "kilometers",
    });
    const ring = ours.geometry.coordinates[0];
    // Should be closed
    expect(ring[0][0]).toBeCloseTo(ring[ring.length - 1][0], 6);
    expect(ring[0][1]).toBeCloseTo(ring[ring.length - 1][1], 6);
    // First point should be the center
    expect(ring[0][0]).toBeCloseTo(0, 6);
    expect(ring[0][1]).toBeCloseTo(0, 6);
  });
});

describe("lineArc", () => {
  it("creates a full circle when bearings are equal", () => {
    const center = [0, 0];
    const radius = 50;
    const ours = lineArc(center, radius, 0, 0, {
      steps: 32,
      units: "kilometers",
    });
    const coords = ours.geometry.coordinates;
    // Full circle: steps + 1 points
    expect(coords.length).toBe(33);
    // Should be closed (first ~= last)
    expect(coords[0][0]).toBeCloseTo(coords[coords.length - 1][0], 4);
    expect(coords[0][1]).toBeCloseTo(coords[coords.length - 1][1], 4);
  });

  it("creates a partial arc", () => {
    const center = [0, 0];
    const radius = 50;
    const ours = lineArc(center, radius, 0, 90, {
      steps: 32,
      units: "kilometers",
    });
    const coords = ours.geometry.coordinates;
    expect(coords.length).toBe(33);
    // Start and end should be different
    const dx = coords[0][0] - coords[coords.length - 1][0];
    const dy = coords[0][1] - coords[coords.length - 1][1];
    expect(Math.sqrt(dx * dx + dy * dy)).toBeGreaterThan(0.01);
  });
});

describe("destination", () => {
  it("computes destination from (0,0) going 100km north", () => {
    const origin = [0, 0];
    const ours = destination(origin, 100, 0, { units: "kilometers" });
    const theirs = turf.destination(origin, 100, 0, {
      units: "kilometers",
    });
    expect(ours.geometry.coordinates[0]).toBeCloseTo(
      theirs.geometry.coordinates[0],
      6,
    );
    expect(ours.geometry.coordinates[1]).toBeCloseTo(
      theirs.geometry.coordinates[1],
      6,
    );
  });
});

describe("rhumbDestination", () => {
  it("matches turf rhumbDestination", () => {
    const origin = [10, 20];
    const ours = rhumbDestination(origin, 200, 45, {
      units: "kilometers",
    });
    const theirs = turf.rhumbDestination(origin, 200, 45, {
      units: "kilometers",
    });
    expect(ours.geometry.coordinates[0]).toBeCloseTo(
      theirs.geometry.coordinates[0],
      6,
    );
    expect(ours.geometry.coordinates[1]).toBeCloseTo(
      theirs.geometry.coordinates[1],
      6,
    );
  });
});

describe("along", () => {
  const line = turf.lineString([
    [0, 0],
    [1, 0],
    [2, 0],
  ]);

  it("returns start point at distance 0", () => {
    const ours = along(line as GeoJSON.Feature<GeoJSON.LineString>, 0, {
      units: "kilometers",
    });
    const theirs = turf.along(line, 0, { units: "kilometers" });
    expect(ours.geometry.coordinates[0]).toBeCloseTo(
      theirs.geometry.coordinates[0],
      4,
    );
    expect(ours.geometry.coordinates[1]).toBeCloseTo(
      theirs.geometry.coordinates[1],
      4,
    );
  });

  it("returns end point at full length", () => {
    const totalLength = turf.length(line, { units: "kilometers" });
    const ours = along(
      line as GeoJSON.Feature<GeoJSON.LineString>,
      totalLength + 100,
      { units: "kilometers" },
    );
    const theirs = turf.along(line, totalLength + 100, {
      units: "kilometers",
    });
    expect(ours.geometry.coordinates[0]).toBeCloseTo(
      theirs.geometry.coordinates[0],
      4,
    );
    expect(ours.geometry.coordinates[1]).toBeCloseTo(
      theirs.geometry.coordinates[1],
      4,
    );
  });

  it("returns midway point", () => {
    const totalLength = turf.length(line, { units: "kilometers" });
    const midDist = totalLength / 2;
    const ours = along(
      line as GeoJSON.Feature<GeoJSON.LineString>,
      midDist,
      { units: "kilometers" },
    );
    const theirs = turf.along(line, midDist, { units: "kilometers" });
    expect(ours.geometry.coordinates[0]).toBeCloseTo(
      theirs.geometry.coordinates[0],
      4,
    );
    expect(ours.geometry.coordinates[1]).toBeCloseTo(
      theirs.geometry.coordinates[1],
      4,
    );
  });
});

describe("greatCircle", () => {
  it("computes NYC to London great circle", () => {
    const nyc = [-73.9857, 40.7484];
    const london = [-0.1278, 51.5074];
    const ours = greatCircle(nyc, london, { npoints: 50 });
    const theirs = turf.greatCircle(nyc, london, { npoints: 50 });
    const ourCoords = ours.geometry.coordinates;
    const theirCoords = theirs.geometry.coordinates;
    expect(ourCoords.length).toBe(theirCoords.length);

    // Intermediate points should not be on a straight line in lng/lat
    const midIdx = Math.floor(ourCoords.length / 2);
    const midLat = ourCoords[midIdx][1];
    const straightMidLat = (nyc[1] + london[1]) / 2;
    expect(Math.abs(midLat - straightMidLat)).toBeGreaterThan(0.1);

    // Compare endpoint vicinity with turf
    expect(ourCoords[0][0]).toBeCloseTo(theirCoords[0][0], 4);
    expect(ourCoords[0][1]).toBeCloseTo(theirCoords[0][1], 4);
    const last = ourCoords.length - 1;
    expect(ourCoords[last][0]).toBeCloseTo(theirCoords[last][0], 4);
    expect(ourCoords[last][1]).toBeCloseTo(theirCoords[last][1], 4);
  });
});

describe("buffer", () => {
  it("buffers a Point (approximates circle)", () => {
    const pt = turf.point([0, 0]);
    const ours = buffer(pt as GeoJSON.Feature, 10, {
      units: "kilometers",
      steps: 16,
    });
    expect(ours).toBeDefined();
    expect(ours!.type).toBe("Feature");
    expect((ours as GeoJSON.Feature).geometry.type).toBe("Polygon");
    const ring = (
      (ours as GeoJSON.Feature).geometry as GeoJSON.Polygon
    ).coordinates[0];
    // Should be closed
    expect(ring[0][0]).toBeCloseTo(ring[ring.length - 1][0], 6);
    expect(ring[0][1]).toBeCloseTo(ring[ring.length - 1][1], 6);
    // Should have steps + 1 points
    expect(ring.length).toBe(17);
  });

  it("buffers a LineString and produces a Polygon", () => {
    const line = turf.lineString([
      [0, 0],
      [1, 0],
      [2, 0],
    ]);
    const ours = buffer(line as GeoJSON.Feature, 10, {
      units: "kilometers",
      steps: 8,
    });
    expect(ours).toBeDefined();
    expect(ours!.type).toBe("Feature");
    expect((ours as GeoJSON.Feature).geometry.type).toBe("Polygon");
    const ring = (
      (ours as GeoJSON.Feature).geometry as GeoJSON.Polygon
    ).coordinates[0];
    // Should be closed
    expect(ring[0][0]).toBeCloseTo(ring[ring.length - 1][0], 6);
    expect(ring[0][1]).toBeCloseTo(ring[ring.length - 1][1], 6);
    // Should have more than 4 points (not degenerate)
    expect(ring.length).toBeGreaterThan(4);
  });
});
