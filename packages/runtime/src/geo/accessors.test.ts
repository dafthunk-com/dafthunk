import { describe, expect, it } from "vitest";
import { bbox, explode, combine, flatten, flip } from "./accessors";
import * as turf from "@turf/turf";

describe("bbox", () => {
  it("should match turf for a Point", () => {
    const pt: GeoJSON.Point = { type: "Point", coordinates: [10, 20] };
    expect(bbox(pt)).toEqual(turf.bbox(pt));
  });

  it("should match turf for a LineString", () => {
    const line: GeoJSON.LineString = {
      type: "LineString",
      coordinates: [
        [0, 0],
        [10, 10],
        [5, 15],
      ],
    };
    expect(bbox(line)).toEqual(turf.bbox(line));
  });

  it("should match turf for a Polygon", () => {
    const poly: GeoJSON.Polygon = {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
          [0, 0],
        ],
      ],
    };
    expect(bbox(poly)).toEqual(turf.bbox(poly));
  });

  it("should match turf for a MultiPolygon", () => {
    const mp: GeoJSON.MultiPolygon = {
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [0, 0],
            [5, 0],
            [5, 5],
            [0, 5],
            [0, 0],
          ],
        ],
        [
          [
            [10, 10],
            [20, 10],
            [20, 20],
            [10, 20],
            [10, 10],
          ],
        ],
      ],
    };
    expect(bbox(mp)).toEqual(turf.bbox(mp));
  });

  it("should match turf for a FeatureCollection", () => {
    const fc: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [-10, -20] } },
        { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [30, 40] } },
      ],
    };
    expect(bbox(fc)).toEqual(turf.bbox(fc));
  });

  it("should match turf for a GeometryCollection", () => {
    const gc: GeoJSON.GeometryCollection = {
      type: "GeometryCollection",
      geometries: [
        { type: "Point", coordinates: [1, 2] },
        { type: "Point", coordinates: [3, 4] },
        {
          type: "LineString",
          coordinates: [
            [-5, -5],
            [5, 5],
          ],
        },
      ],
    };
    expect(bbox(gc)).toEqual(turf.bbox(gc));
  });
});

describe("explode", () => {
  it("should match turf for a Polygon", () => {
    const poly = turf.polygon([
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ],
    ]);
    expect(explode(poly)).toEqual(turf.explode(poly));
  });

  it("should match turf for a FeatureCollection", () => {
    const fc = turf.featureCollection([
      turf.point([1, 2]),
      turf.point([3, 4]),
      turf.lineString([
        [5, 6],
        [7, 8],
      ]),
    ]);
    expect(explode(fc)).toEqual(turf.explode(fc));
  });

  it("should produce correct point count for a Polygon", () => {
    const poly = turf.polygon([
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ],
    ]);
    const result = explode(poly);
    const turfResult = turf.explode(poly);
    expect(result.features.length).toBe(turfResult.features.length);
    expect(result.features.length).toBe(5);
  });
});

describe("combine", () => {
  it("should match turf geometry for a mix of Points, LineStrings, and Polygons", () => {
    const fc = turf.featureCollection([
      turf.point([1, 2]),
      turf.point([3, 4]),
      turf.lineString([
        [0, 0],
        [10, 10],
      ]),
      turf.lineString([
        [5, 5],
        [15, 15],
      ]),
      turf.polygon([
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
      ]),
    ]);
    const ours = combine(fc);
    const turfs = turf.combine(fc);
    expect(ours.features.length).toBe(turfs.features.length);

    const oursByType = Object.fromEntries(ours.features.map((f) => [f.geometry.type, f.geometry]));
    const turfsByType = Object.fromEntries(turfs.features.map((f) => [f.geometry.type, f.geometry]));
    expect(Object.keys(oursByType).sort()).toEqual(Object.keys(turfsByType).sort());
    for (const type of Object.keys(oursByType)) {
      expect(oursByType[type]).toEqual(turfsByType[type]);
    }
  });
});

describe("flatten", () => {
  it("should match turf for MultiPoint to Points", () => {
    const mp = turf.multiPoint([
      [1, 2],
      [3, 4],
      [5, 6],
    ]);
    expect(flatten(mp)).toEqual(turf.flatten(mp));
  });

  it("should match turf for MultiPolygon to Polygons", () => {
    const mpoly = turf.multiPolygon([
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
    expect(flatten(mpoly)).toEqual(turf.flatten(mpoly));
  });

  it("should match turf for a nested GeometryCollection", () => {
    const gc: GeoJSON.Feature<GeoJSON.GeometryCollection> = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "GeometryCollection",
        geometries: [
          { type: "Point", coordinates: [1, 2] },
          {
            type: "MultiPoint",
            coordinates: [
              [3, 4],
              [5, 6],
            ],
          },
        ],
      },
    };
    expect(flatten(gc)).toEqual(turf.flatten(gc));
  });
});

describe("flip", () => {
  it("should match turf for a Point", () => {
    const pt = turf.point([10, 20]);
    expect(flip(pt)).toEqual(turf.flip(pt));
  });

  it("should match turf for a LineString", () => {
    const line = turf.lineString([
      [0, 1],
      [2, 3],
      [4, 5],
    ]);
    expect(flip(line)).toEqual(turf.flip(line));
  });

  it("should match turf for a Polygon", () => {
    const poly = turf.polygon([
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ],
    ]);
    expect(flip(poly)).toEqual(turf.flip(poly));
  });

  it("should match turf for a FeatureCollection", () => {
    const fc = turf.featureCollection([
      turf.point([1, 2]),
      turf.lineString([
        [3, 4],
        [5, 6],
      ]),
    ]);
    expect(flip(fc)).toEqual(turf.flip(fc));
  });
});
