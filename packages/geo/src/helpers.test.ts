import * as turf from "@turf/turf";
import { describe, expect, it } from "vitest";
import {
  feature,
  featureCollection,
  geometryCollection,
  getCoord,
  getCoords,
  getGeom,
  lineString,
  multiLineString,
  multiPoint,
  multiPolygon,
  point,
  polygon,
  round,
} from "./helpers";

describe("point", () => {
  it("creates a point with valid coordinates", () => {
    const result = point([10, 20]);
    const turfResult = turf.point([10, 20]);
    expect(result).toEqual(turfResult);
  });

  it("creates a point with properties", () => {
    const result = point([10, 20], { name: "test" });
    const turfResult = turf.point([10, 20], { name: "test" });
    expect(result).toEqual(turfResult);
  });

  it("creates a point with an id", () => {
    const result = point([10, 20], {}, { id: "abc" });
    const turfResult = turf.point([10, 20], {}, { id: "abc" });
    expect(result).toEqual(turfResult);
  });

  it("creates a point with 3D coordinates", () => {
    const result = point([10, 20, 100]);
    const turfResult = turf.point([10, 20, 100]);
    expect(result).toEqual(turfResult);
  });

  it("throws on invalid input (too few coordinates)", () => {
    expect(() => point([10])).toThrow();
  });

  it("throws when coordinates is not an array", () => {
    // biome-ignore lint/suspicious/noExplicitAny: testing invalid input
    expect(() => point(null as any)).toThrow();
  });
});

describe("lineString", () => {
  it("creates a lineString with valid coordinates", () => {
    const coords = [
      [0, 0],
      [1, 1],
    ];
    const result = lineString(coords);
    const turfResult = turf.lineString(coords);
    expect(result).toEqual(turfResult);
  });

  it("throws on fewer than 2 positions", () => {
    expect(() => lineString([[0, 0]])).toThrow();
  });

  it("creates a lineString with properties and id", () => {
    const coords = [
      [0, 0],
      [1, 1],
      [2, 2],
    ];
    const result = lineString(coords, { name: "road" }, { id: 42 });
    const turfResult = turf.lineString(coords, { name: "road" }, { id: 42 });
    expect(result).toEqual(turfResult);
  });
});

describe("polygon", () => {
  const ring = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 0],
  ];

  it("creates a polygon with a valid ring", () => {
    const result = polygon([ring]);
    const turfResult = turf.polygon([ring]);
    expect(result).toEqual(turfResult);
  });

  it("throws on unclosed ring", () => {
    const unclosed = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ];
    expect(() => polygon([unclosed])).toThrow(
      "First and last Position are not equivalent."
    );
  });

  it("throws on ring with fewer than 4 positions", () => {
    const short = [
      [0, 0],
      [1, 0],
      [0, 0],
    ];
    expect(() => polygon([short])).toThrow();
  });

  it("creates a polygon with properties", () => {
    const result = polygon([ring], { area: 0.5 });
    const turfResult = turf.polygon([ring], { area: 0.5 });
    expect(result).toEqual(turfResult);
  });
});

describe("multiPoint", () => {
  it("creates a multiPoint", () => {
    const coords = [
      [0, 0],
      [1, 1],
    ];
    const result = multiPoint(coords);
    const turfResult = turf.multiPoint(coords);
    expect(result).toEqual(turfResult);
  });

  it("creates a multiPoint with properties", () => {
    const coords = [
      [0, 0],
      [1, 1],
    ];
    const result = multiPoint(coords, { group: "A" });
    const turfResult = turf.multiPoint(coords, { group: "A" });
    expect(result).toEqual(turfResult);
  });
});

describe("multiLineString", () => {
  it("creates a multiLineString", () => {
    const coords = [
      [
        [0, 0],
        [1, 1],
      ],
      [
        [2, 2],
        [3, 3],
      ],
    ];
    const result = multiLineString(coords);
    const turfResult = turf.multiLineString(coords);
    expect(result).toEqual(turfResult);
  });
});

describe("multiPolygon", () => {
  it("creates a multiPolygon", () => {
    const coords = [
      [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 0],
        ],
      ],
      [
        [
          [2, 2],
          [3, 2],
          [3, 3],
          [2, 2],
        ],
      ],
    ];
    const result = multiPolygon(coords);
    const turfResult = turf.multiPolygon(coords);
    expect(result).toEqual(turfResult);
  });
});

describe("feature", () => {
  it("wraps a Point geometry", () => {
    const geom = { type: "Point" as const, coordinates: [10, 20] };
    const result = feature(geom);
    const turfResult = turf.feature(geom);
    expect(result).toEqual(turfResult);
  });

  it("wraps a LineString geometry with properties", () => {
    const geom = {
      type: "LineString" as const,
      coordinates: [
        [0, 0],
        [1, 1],
      ],
    };
    const result = feature(geom, { name: "line" });
    const turfResult = turf.feature(geom, { name: "line" });
    expect(result).toEqual(turfResult);
  });

  it("wraps a Polygon geometry with id", () => {
    const geom = {
      type: "Polygon" as const,
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 0],
        ],
      ],
    };
    const result = feature(geom, {}, { id: "poly1" });
    const turfResult = turf.feature(geom, {}, { id: "poly1" });
    expect(result).toEqual(turfResult);
  });
});

describe("featureCollection", () => {
  it("creates an empty feature collection", () => {
    const result = featureCollection([]);
    const turfResult = turf.featureCollection([]);
    expect(result).toEqual(turfResult);
  });

  it("creates a feature collection with features", () => {
    const features = [point([0, 0]), point([1, 1])];
    const turfFeatures = [turf.point([0, 0]), turf.point([1, 1])];
    const result = featureCollection(features);
    const turfResult = turf.featureCollection(turfFeatures);
    expect(result).toEqual(turfResult);
  });
});

describe("geometryCollection", () => {
  it("creates a geometry collection", () => {
    const geometries = [
      { type: "Point" as const, coordinates: [0, 0] },
      {
        type: "LineString" as const,
        coordinates: [
          [0, 0],
          [1, 1],
        ],
      },
    ];
    const result = geometryCollection(geometries);
    const turfResult = turf.geometryCollection(geometries);
    expect(result).toEqual(turfResult);
  });

  it("creates a geometry collection with properties", () => {
    const geometries = [{ type: "Point" as const, coordinates: [5, 5] }];
    const result = geometryCollection(geometries, { label: "mixed" });
    const turfResult = turf.geometryCollection(geometries, { label: "mixed" });
    expect(result).toEqual(turfResult);
  });
});

describe("round", () => {
  it("rounds to 0 decimal places", () => {
    expect(round(1.234)).toBe(1);
    expect(round(1.567)).toBe(2);
    expect(round(turf.round(1.234))).toBe(turf.round(1.234));
  });

  it("rounds to 2 decimal places", () => {
    expect(round(1.2345, 2)).toBe(1.23);
    expect(round(1.2345, 2)).toBe(turf.round(1.2345, 2));
  });

  it("rounds to 6 decimal places", () => {
    expect(round(1.23456789, 6)).toBe(1.234568);
    expect(round(1.23456789, 6)).toBe(turf.round(1.23456789, 6));
  });

  it("rounds negative numbers", () => {
    expect(round(-1.5)).toBe(-1);
    expect(round(-1.567, 2)).toBe(-1.57);
    expect(round(-1.567, 2)).toBe(turf.round(-1.567, 2));
  });
});

describe("getCoord", () => {
  it("returns coord from a plain array", () => {
    const coord = [10, 20];
    expect(getCoord(coord)).toEqual(coord);
  });

  it("returns coord from a Point geometry", () => {
    const pt = { type: "Point" as const, coordinates: [10, 20] };
    const result = getCoord(pt);
    expect(result).toEqual([10, 20]);
    expect(result).toEqual(turf.getCoord(pt));
  });

  it("returns coord from a Feature<Point>", () => {
    const feat = point([10, 20]);
    const turfFeat = turf.point([10, 20]);
    const result = getCoord(feat);
    expect(result).toEqual([10, 20]);
    expect(result).toEqual(turf.getCoord(turfFeat));
  });
});

describe("getCoords", () => {
  it("returns coordinates from a Feature", () => {
    const feat = lineString([
      [0, 0],
      [1, 1],
    ]);
    const turfFeat = turf.lineString([
      [0, 0],
      [1, 1],
    ]);
    const result = getCoords(feat);
    expect(result).toEqual([
      [0, 0],
      [1, 1],
    ]);
    expect(result).toEqual(turf.getCoords(turfFeat));
  });

  it("returns coordinates from a Geometry", () => {
    const geom = {
      type: "Polygon" as const,
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 0],
        ],
      ],
    };
    const result = getCoords(geom);
    expect(result).toEqual(geom.coordinates);
    expect(result).toEqual(turf.getCoords(geom));
  });
});

describe("getGeom", () => {
  it("returns geometry from a Feature", () => {
    const feat = point([10, 20]);
    const turfFeat = turf.point([10, 20]);
    const result = getGeom(feat);
    expect(result).toEqual({ type: "Point", coordinates: [10, 20] });
    expect(result).toEqual(turf.getGeom(turfFeat));
  });

  it("returns geometry when given a Geometry directly", () => {
    const geom = { type: "Point" as const, coordinates: [10, 20] };
    const result = getGeom(geom);
    expect(result).toEqual(geom);
    expect(result).toEqual(turf.getGeom(geom));
  });

  it("returns geometry collection from a Feature", () => {
    const gc = geometryCollection([
      { type: "Point" as const, coordinates: [0, 0] },
    ]);
    const turfGc = turf.geometryCollection([
      { type: "Point" as const, coordinates: [0, 0] },
    ]);
    const result = getGeom(gc);
    expect(result).toEqual(turfGc.geometry);
  });
});
