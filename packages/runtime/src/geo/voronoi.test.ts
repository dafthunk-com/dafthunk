import { describe, expect, it } from "vitest";
import { voronoi } from "./voronoi";
import { point, featureCollection } from "./helpers";
import * as turf from "@turf/turf";

describe("voronoi", () => {
  it("should return 4 polygons for 4 points in a square arrangement", () => {
    const pts = featureCollection([
      point([0, 0]),
      point([10, 0]),
      point([10, 10]),
      point([0, 10]),
    ]);

    const result = voronoi(pts, { bbox: [-20, -20, 20, 20] });
    expect(result.type).toBe("FeatureCollection");
    expect(result.features).toHaveLength(4);

    for (const feat of result.features) {
      expect(feat.geometry.type).toBe("Polygon");
    }
  });

  it("should clip polygons to a custom bbox", () => {
    const pts = featureCollection([
      point([0, 0]),
      point([10, 0]),
      point([10, 10]),
      point([0, 10]),
    ]);

    const bb: [number, number, number, number] = [-5, -5, 15, 15];
    const result = voronoi(pts, { bbox: bb });

    expect(result.features).toHaveLength(4);

    // All polygon coordinates should be within or on the bbox boundary
    for (const feat of result.features) {
      for (const ring of feat.geometry.coordinates) {
        for (const coord of ring) {
          expect(coord[0]).toBeGreaterThanOrEqual(bb[0] - 0.001);
          expect(coord[0]).toBeLessThanOrEqual(bb[2] + 0.001);
          expect(coord[1]).toBeGreaterThanOrEqual(bb[1] - 0.001);
          expect(coord[1]).toBeLessThanOrEqual(bb[3] + 0.001);
        }
      }
    }
  });

  it("should return 1 polygon for a single point", () => {
    const pts = featureCollection([point([5, 5])]);
    const result = voronoi(pts, { bbox: [0, 0, 10, 10] });

    expect(result.features).toHaveLength(1);
    expect(result.features[0].geometry.type).toBe("Polygon");
  });

  it("should return an empty FeatureCollection for no points", () => {
    const pts = featureCollection<GeoJSON.Point>([]);
    const result = voronoi(pts);

    expect(result.type).toBe("FeatureCollection");
    expect(result.features).toHaveLength(0);
  });
});
