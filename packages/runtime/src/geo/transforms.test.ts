import { describe, expect, it } from "vitest";
import {
  cleanCoords,
  rewind,
  simplify,
  transformRotate,
  transformScale,
  transformTranslate,
  truncate,
} from "./transforms";
import * as turf from "@turf/turf";

describe("simplify", () => {
  const lineCoords: [number, number][] = [];
  for (let i = 0; i <= 100; i++) {
    lineCoords.push([i * 0.1, Math.sin(i * 0.1)]);
  }
  const line = turf.lineString(lineCoords);

  it("simplifies a LineString with tolerance 0.01", () => {
    const ours = simplify(JSON.parse(JSON.stringify(line)), {
      tolerance: 0.01,
    }) as GeoJSON.Feature<GeoJSON.LineString>;
    const theirs = turf.simplify(JSON.parse(JSON.stringify(line)), {
      tolerance: 0.01,
    });
    expect(ours.geometry.coordinates.length).toBe(
      theirs.geometry.coordinates.length,
    );
  });

  it("simplifies a LineString with tolerance 1.0", () => {
    const ours = simplify(JSON.parse(JSON.stringify(line)), {
      tolerance: 1.0,
    }) as GeoJSON.Feature<GeoJSON.LineString>;
    const theirs = turf.simplify(JSON.parse(JSON.stringify(line)), {
      tolerance: 1.0,
    });
    expect(ours.geometry.coordinates.length).toBe(
      theirs.geometry.coordinates.length,
    );
  });

  it("simplifies with highQuality option", () => {
    const ours = simplify(JSON.parse(JSON.stringify(line)), {
      tolerance: 0.01,
      highQuality: true,
    }) as GeoJSON.Feature<GeoJSON.LineString>;
    const theirs = turf.simplify(JSON.parse(JSON.stringify(line)), {
      tolerance: 0.01,
      highQuality: true,
    });
    expect(ours.geometry.coordinates.length).toBe(
      theirs.geometry.coordinates.length,
    );
  });
});

describe("truncate", () => {
  it("truncates a Point with 15-digit precision to 6 digits", () => {
    const pt = turf.point([1.123456789012345, 2.987654321098765]);
    const ours = truncate(JSON.parse(JSON.stringify(pt)), {
      precision: 6,
    }) as GeoJSON.Feature<GeoJSON.Point>;
    const theirs = turf.truncate(JSON.parse(JSON.stringify(pt)), {
      precision: 6,
    });
    expect(ours.geometry.coordinates[0]).toBe(
      theirs.geometry.coordinates[0],
    );
    expect(ours.geometry.coordinates[1]).toBe(
      theirs.geometry.coordinates[1],
    );
  });

  it("truncates a LineString", () => {
    const line = turf.lineString([
      [1.123456789, 2.987654321],
      [3.111111111, 4.222222222],
    ]);
    const ours = truncate(JSON.parse(JSON.stringify(line)), {
      precision: 3,
    }) as GeoJSON.Feature<GeoJSON.LineString>;
    const theirs = turf.truncate(JSON.parse(JSON.stringify(line)), {
      precision: 3,
    });
    expect(ours.geometry.coordinates).toEqual(theirs.geometry.coordinates);
  });

  it("limits coordinates to 2D with coordinates param", () => {
    const pt = turf.point([1.123456, 2.654321, 100.999999]);
    const ours = truncate(JSON.parse(JSON.stringify(pt)), {
      precision: 6,
      coordinates: 2,
    }) as GeoJSON.Feature<GeoJSON.Point>;
    const theirs = turf.truncate(JSON.parse(JSON.stringify(pt)), {
      precision: 6,
      coordinates: 2,
    });
    expect(ours.geometry.coordinates.length).toBe(2);
    expect(ours.geometry.coordinates).toEqual(theirs.geometry.coordinates);
  });
});

describe("cleanCoords", () => {
  it("removes duplicate consecutive coords from a LineString", () => {
    const line = turf.lineString([
      [0, 0],
      [1, 1],
      [1, 1],
      [2, 2],
      [2, 2],
      [2, 2],
      [3, 3],
    ]);
    const ours = cleanCoords(
      JSON.parse(JSON.stringify(line)),
    ) as GeoJSON.Feature<GeoJSON.LineString>;
    const theirs = turf.cleanCoords(JSON.parse(JSON.stringify(line)));
    expect(ours.geometry.coordinates.length).toBe(
      theirs.geometry.coordinates.length,
    );
    expect(ours.geometry.coordinates).toEqual(theirs.geometry.coordinates);
  });

  it("removes duplicate consecutive coords from a Polygon", () => {
    const poly = turf.polygon([
      [
        [0, 0],
        [1, 0],
        [1, 0],
        [1, 1],
        [1, 1],
        [0, 1],
        [0, 0],
      ],
    ]);
    const ours = cleanCoords(
      JSON.parse(JSON.stringify(poly)),
    ) as GeoJSON.Feature<GeoJSON.Polygon>;
    const theirs = turf.cleanCoords(JSON.parse(JSON.stringify(poly)));
    expect(ours.geometry.coordinates[0].length).toBe(
      (theirs.geometry as GeoJSON.Polygon).coordinates[0].length,
    );
  });
});

describe("rewind", () => {
  it("rewinds a clockwise Polygon to counter-clockwise (RFC 7946)", () => {
    // Clockwise ring
    const clockwiseRing: [number, number][] = [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
      [0, 0],
    ];
    const poly = turf.polygon([clockwiseRing]);
    const ours = rewind(
      JSON.parse(JSON.stringify(poly)),
    ) as GeoJSON.Feature<GeoJSON.Polygon>;
    const theirs = turf.rewind(JSON.parse(JSON.stringify(poly)));
    expect(ours.geometry.coordinates[0]).toEqual(
      theirs.geometry.coordinates[0],
    );
  });

  it("respects the reverse option", () => {
    const ccwRing: [number, number][] = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ];
    const poly = turf.polygon([ccwRing]);
    const ours = rewind(JSON.parse(JSON.stringify(poly)), {
      reverse: true,
    }) as GeoJSON.Feature<GeoJSON.Polygon>;
    const theirs = turf.rewind(JSON.parse(JSON.stringify(poly)), {
      reverse: true,
    });
    expect(ours.geometry.coordinates[0]).toEqual(
      theirs.geometry.coordinates[0],
    );
  });
});

describe("transformScale", () => {
  it("returns Point unchanged (no-op)", () => {
    const pt = turf.point([10, 20]);
    const ours = transformScale(
      JSON.parse(JSON.stringify(pt)),
      2,
    ) as GeoJSON.Feature<GeoJSON.Point>;
    const theirs = turf.transformScale(JSON.parse(JSON.stringify(pt)), 2);
    expect(ours.geometry.coordinates[0]).toBeCloseTo(
      theirs.geometry.coordinates[0],
      6,
    );
    expect(ours.geometry.coordinates[1]).toBeCloseTo(
      theirs.geometry.coordinates[1],
      6,
    );
  });

  it("scales a Polygon by 2x", () => {
    const poly = turf.polygon([
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ],
    ]);
    const ours = transformScale(
      JSON.parse(JSON.stringify(poly)),
      2,
    ) as GeoJSON.Feature<GeoJSON.Polygon>;
    const theirs = turf.transformScale(
      JSON.parse(JSON.stringify(poly)),
      2,
    );
    const ourCoords = ours.geometry.coordinates[0];
    const theirCoords = theirs.geometry.coordinates[0];
    expect(ourCoords.length).toBe(theirCoords.length);
    for (let i = 0; i < ourCoords.length; i++) {
      expect(ourCoords[i][0]).toBeCloseTo(theirCoords[i][0], 4);
      expect(ourCoords[i][1]).toBeCloseTo(theirCoords[i][1], 4);
    }
  });
});

describe("transformRotate", () => {
  it("rotates a Polygon 90 degrees", () => {
    const poly = turf.polygon([
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ],
    ]);
    const ours = transformRotate(
      JSON.parse(JSON.stringify(poly)),
      90,
    ) as GeoJSON.Feature<GeoJSON.Polygon>;
    const theirs = turf.transformRotate(
      JSON.parse(JSON.stringify(poly)),
      90,
    );
    const ourCoords = ours.geometry.coordinates[0];
    const theirCoords = theirs.geometry.coordinates[0];
    expect(ourCoords.length).toBe(theirCoords.length);
    for (let i = 0; i < ourCoords.length; i++) {
      expect(ourCoords[i][0]).toBeCloseTo(theirCoords[i][0], 4);
      expect(ourCoords[i][1]).toBeCloseTo(theirCoords[i][1], 4);
    }
  });
});

describe("transformTranslate", () => {
  it("translates a Point 100km north", () => {
    const pt = turf.point([0, 0]);
    const ours = transformTranslate(JSON.parse(JSON.stringify(pt)), 100, 0, {
      units: "kilometers",
    }) as GeoJSON.Feature<GeoJSON.Point>;
    const theirs = turf.transformTranslate(
      JSON.parse(JSON.stringify(pt)),
      100,
      0,
      { units: "kilometers" },
    );
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
