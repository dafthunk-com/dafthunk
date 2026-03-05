import * as turf from "@turf/turf";
import { describe, expect, it } from "vitest";
import { featureCollection, point, polygon } from "./helpers";
import { shortestPath } from "./pathfinding";

describe("shortestPath", () => {
  it("should return a straight line when there are no obstacles", () => {
    const start = point([0, 0]);
    const end = point([10, 10]);

    const result = shortestPath(start, end);
    expect(result.geometry.type).toBe("LineString");
    expect(result.geometry.coordinates).toHaveLength(2);
    expect(result.geometry.coordinates[0]).toEqual([0, 0]);
    expect(result.geometry.coordinates[1]).toEqual([10, 10]);
  });

  it("should avoid a rectangular obstacle between start and end", () => {
    const start = point([0, 0]);
    const end = point([10, 0]);

    const obstacle = polygon([
      [
        [4, -2],
        [6, -2],
        [6, 2],
        [4, 2],
        [4, -2],
      ],
    ]);

    const obstacles = featureCollection([obstacle]);
    const result = shortestPath(start, end, { obstacles });

    expect(result.geometry.type).toBe("LineString");
    // Path should have more than 2 points since it must go around the obstacle
    expect(result.geometry.coordinates.length).toBeGreaterThan(2);

    // Verify path does not pass through the obstacle midpoint
    const midpoints = [];
    for (let i = 0; i < result.geometry.coordinates.length - 1; i++) {
      const a = result.geometry.coordinates[i];
      const b = result.geometry.coordinates[i + 1];
      midpoints.push([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
    }

    for (const mid of midpoints) {
      const inside = turf.booleanPointInPolygon(
        turf.point(mid),
        turf.polygon([
          [
            [4, -2],
            [6, -2],
            [6, 2],
            [4, 2],
            [4, -2],
          ],
        ])
      );
      expect(inside).toBe(false);
    }
  });

  it("should return a straight line when start and end are very close with no obstacles", () => {
    const start = point([5, 5]);
    const end = point([5.001, 5.001]);

    const result = shortestPath(start, end);
    expect(result.geometry.type).toBe("LineString");
    expect(result.geometry.coordinates).toHaveLength(2);
    expect(result.geometry.coordinates[0]).toEqual([5, 5]);
    expect(result.geometry.coordinates[1]).toEqual([5.001, 5.001]);
  });
});
