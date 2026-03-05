import type {
  Coordinate,
  Feature,
  FeatureCollection,
  Geometry,
  GeometryCollection,
  Point,
  Polygon,
  Units,
} from "./types";
import { getCoord, point, polygon } from "./helpers";
import { distance } from "./measurement";

type AnyGeoJSON = Geometry | GeometryCollection | Feature | FeatureCollection;

export function convex(
  geojson: FeatureCollection | Feature,
  options?: { concavity?: number; properties?: Record<string, unknown> },
): Feature<Polygon> | null {
  const points = extractPoints(geojson);
  if (points.length < 3) return null;

  const hull = grahamScan(points);
  if (hull.length < 3) return null;

  // Close the ring
  const ring = [...hull, hull[0]];
  return polygon([ring], options?.properties);
}

export function concave(
  points: FeatureCollection<Point>,
  options?: { maxEdge?: number; units?: Units; properties?: Record<string, unknown> },
): Feature<Polygon> | null {
  const coords = points.features.map((f) => getCoord(f) as Coordinate);
  if (coords.length < 3) return null;

  // If maxEdge is very large or not set, return convex hull
  const maxEdge = options?.maxEdge ?? Infinity;
  if (maxEdge === Infinity) {
    return convex(points, { properties: options?.properties });
  }

  // Delaunay triangulation via ear-clipping approach
  const triangles = delaunayTriangulate(coords);

  // Filter out triangles with edges longer than maxEdge
  const validTriangles = triangles.filter((tri) => {
    for (let i = 0; i < 3; i++) {
      const a = coords[tri[i]];
      const b = coords[tri[(i + 1) % 3]];
      const d = distance(a, b, { units: options?.units ?? "kilometers" });
      if (d > maxEdge) return false;
    }
    return true;
  });

  if (validTriangles.length === 0) return null;

  // Merge triangles into polygon(s) by finding the outer boundary
  const boundary = findBoundary(validTriangles, coords);
  if (!boundary || boundary.length < 3) return null;

  const ring = [...boundary, boundary[0]];
  return polygon([ring], options?.properties);
}

// Graham scan convex hull
function grahamScan(points: Coordinate[]): Coordinate[] {
  const n = points.length;
  if (n < 3) return [...points];

  // Find the point with the lowest y (and leftmost if tie)
  let pivot = 0;
  for (let i = 1; i < n; i++) {
    if (points[i][1] < points[pivot][1] ||
        (points[i][1] === points[pivot][1] && points[i][0] < points[pivot][0])) {
      pivot = i;
    }
  }

  // Swap pivot to first position
  const sorted = [...points];
  [sorted[0], sorted[pivot]] = [sorted[pivot], sorted[0]];
  const p0 = sorted[0];

  // Sort by polar angle relative to pivot
  sorted.sort((a, b) => {
    if (a === p0) return -1;
    if (b === p0) return 1;
    const angle = cross(p0, a, b);
    if (angle === 0) {
      // Collinear - closer one first
      const dA = sqDist(p0, a);
      const dB = sqDist(p0, b);
      return dA - dB;
    }
    return -angle; // CCW sort
  });

  const stack: Coordinate[] = [sorted[0], sorted[1]];
  for (let i = 2; i < sorted.length; i++) {
    while (stack.length > 1 && cross(stack[stack.length - 2], stack[stack.length - 1], sorted[i]) <= 0) {
      stack.pop();
    }
    stack.push(sorted[i]);
  }

  return stack;
}

function cross(o: Coordinate, a: Coordinate, b: Coordinate): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

function sqDist(a: Coordinate, b: Coordinate): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
}

function extractPoints(geojson: AnyGeoJSON): Coordinate[] {
  const points: Coordinate[] = [];

  function processCoords(coords: Coordinate | Coordinate[] | Coordinate[][] | Coordinate[][][]): void {
    if (typeof coords[0] === "number") {
      points.push(coords as Coordinate);
      return;
    }
    for (const c of coords as (Coordinate | Coordinate[] | Coordinate[][])[]) {
      processCoords(c as Coordinate);
    }
  }

  function processGeom(geom: Geometry | GeometryCollection): void {
    if (geom.type === "GeometryCollection") {
      for (const g of (geom as GeometryCollection).geometries) processGeom(g);
    } else {
      processCoords((geom as Geometry).coordinates);
    }
  }

  if (geojson.type === "FeatureCollection") {
    for (const f of (geojson as FeatureCollection).features) processGeom(f.geometry);
  } else if (geojson.type === "Feature") {
    processGeom((geojson as Feature).geometry);
  } else {
    processGeom(geojson as Geometry | GeometryCollection);
  }

  return points;
}

// Simple Delaunay triangulation (Bowyer-Watson)
function delaunayTriangulate(points: Coordinate[]): [number, number, number][] {
  if (points.length < 3) return [];

  // Create a super triangle that contains all points
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p[0] < minX) minX = p[0];
    if (p[1] < minY) minY = p[1];
    if (p[0] > maxX) maxX = p[0];
    if (p[1] > maxY) maxY = p[1];
  }
  const dx = maxX - minX;
  const dy = maxY - minY;
  const dmax = Math.max(dx, dy);
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;

  // Super triangle vertices
  const superPoints: Coordinate[] = [
    [midX - 20 * dmax, midY - dmax],
    [midX, midY + 20 * dmax],
    [midX + 20 * dmax, midY - dmax],
  ];

  const allPoints = [...points, ...superPoints];
  const n = points.length;

  // Initial triangle is the super triangle
  let triangles: [number, number, number][] = [[n, n + 1, n + 2]];

  // Insert points one by one
  for (let i = 0; i < n; i++) {
    const p = allPoints[i];
    const badTriangles: number[] = [];

    // Find all triangles whose circumcircle contains the new point
    for (let t = 0; t < triangles.length; t++) {
      const tri = triangles[t];
      if (inCircumcircle(p, allPoints[tri[0]], allPoints[tri[1]], allPoints[tri[2]])) {
        badTriangles.push(t);
      }
    }

    // Find the boundary of the polygonal hole
    const edges: [number, number][] = [];
    for (const t of badTriangles) {
      const tri = triangles[t];
      for (let e = 0; e < 3; e++) {
        const edge: [number, number] = [tri[e], tri[(e + 1) % 3]];
        // Check if this edge is shared with another bad triangle
        let shared = false;
        for (const t2 of badTriangles) {
          if (t2 === t) continue;
          const tri2 = triangles[t2];
          for (let e2 = 0; e2 < 3; e2++) {
            if (
              (tri2[e2] === edge[0] && tri2[(e2 + 1) % 3] === edge[1]) ||
              (tri2[e2] === edge[1] && tri2[(e2 + 1) % 3] === edge[0])
            ) {
              shared = true;
              break;
            }
          }
          if (shared) break;
        }
        if (!shared) edges.push(edge);
      }
    }

    // Remove bad triangles (in reverse order to preserve indices)
    badTriangles.sort((a, b) => b - a);
    for (const t of badTriangles) {
      triangles.splice(t, 1);
    }

    // Create new triangles from boundary edges to new point
    for (const edge of edges) {
      triangles.push([i, edge[0], edge[1]]);
    }
  }

  // Remove triangles that share vertices with the super triangle
  triangles = triangles.filter(
    (tri) => tri[0] < n && tri[1] < n && tri[2] < n,
  );

  return triangles;
}

function inCircumcircle(p: Coordinate, a: Coordinate, b: Coordinate, c: Coordinate): boolean {
  const ax = a[0] - p[0];
  const ay = a[1] - p[1];
  const bx = b[0] - p[0];
  const by = b[1] - p[1];
  const cx = c[0] - p[0];
  const cy = c[1] - p[1];

  const det =
    (ax * ax + ay * ay) * (bx * cy - cx * by) -
    (bx * bx + by * by) * (ax * cy - cx * ay) +
    (cx * cx + cy * cy) * (ax * by - bx * ay);

  return det > 0;
}

function findBoundary(
  triangles: [number, number, number][],
  points: Coordinate[],
): Coordinate[] | null {
  // Count edge occurrences - boundary edges appear exactly once
  const edgeMap = new Map<string, { count: number; from: number; to: number }>();

  for (const tri of triangles) {
    for (let i = 0; i < 3; i++) {
      const a = tri[i];
      const b = tri[(i + 1) % 3];
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      const existing = edgeMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        edgeMap.set(key, { count: 1, from: a, to: b });
      }
    }
  }

  // Collect boundary edges
  const boundaryEdges: [number, number][] = [];
  for (const edge of edgeMap.values()) {
    if (edge.count === 1) {
      boundaryEdges.push([edge.from, edge.to]);
    }
  }

  if (boundaryEdges.length === 0) return null;

  // Chain edges into a ring
  const adjacency = new Map<number, number[]>();
  for (const [a, b] of boundaryEdges) {
    if (!adjacency.has(a)) adjacency.set(a, []);
    if (!adjacency.has(b)) adjacency.set(b, []);
    adjacency.get(a)!.push(b);
    adjacency.get(b)!.push(a);
  }

  const visited = new Set<number>();
  const ring: Coordinate[] = [];
  let current = boundaryEdges[0][0];

  while (!visited.has(current)) {
    visited.add(current);
    ring.push(points[current]);
    const neighbors = adjacency.get(current) ?? [];
    const next = neighbors.find((n) => !visited.has(n));
    if (next === undefined) break;
    current = next;
  }

  return ring;
}
