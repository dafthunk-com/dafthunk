import { booleanPointInPolygon } from "./booleans";
import { getCoord, lineString } from "./helpers";
import { distance } from "./measurement";
import type {
  Coordinate,
  Feature,
  FeatureCollection,
  LineString,
  Point,
  Polygon,
  Units,
} from "./types";

export function shortestPath(
  start: Feature<Point> | Point | number[],
  end: Feature<Point> | Point | number[],
  options?: {
    obstacles?: FeatureCollection<Polygon>;
    units?: Units;
    resolution?: number;
  }
): Feature<LineString> {
  const startCoord = getCoord(start) as Coordinate;
  const endCoord = getCoord(end) as Coordinate;

  // If no obstacles, return straight line
  if (!options?.obstacles || options.obstacles.features.length === 0) {
    return lineString([startCoord, endCoord]);
  }

  const obstacles = options.obstacles;
  const units = options.units ?? "kilometers";
  const _resolution =
    options.resolution ?? distance(startCoord, endCoord, { units }) / 100;

  // Check if straight line works (no obstacles in the way)
  if (!lineIntersectsObstacles(startCoord, endCoord, obstacles)) {
    return lineString([startCoord, endCoord]);
  }

  // Build visibility graph
  const vertices: Coordinate[] = [startCoord, endCoord];

  // Add obstacle vertices (slightly offset outward to avoid boundary issues)
  const OFFSET = 1e-6;
  for (const obstacle of obstacles.features) {
    const ring = obstacle.geometry.coordinates[0] as Coordinate[];
    const n = ring.length - 1;
    // Compute centroid of this ring
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < n; i++) {
      cx += ring[i][0];
      cy += ring[i][1];
    }
    cx /= n;
    cy /= n;

    for (let i = 0; i < n; i++) {
      // Offset vertex away from centroid
      const dx = ring[i][0] - cx;
      const dy = ring[i][1] - cy;
      const len = Math.sqrt(dx * dx + dy * dy);
      const offsetCoord: Coordinate =
        len > 0
          ? [ring[i][0] + (dx / len) * OFFSET, ring[i][1] + (dy / len) * OFFSET]
          : ring[i];

      // Check vertex is not strictly inside any obstacle
      let insideAny = false;
      for (const obs of obstacles.features) {
        if (booleanPointInPolygon(offsetCoord, obs, { ignoreBoundary: true })) {
          insideAny = true;
          break;
        }
      }
      if (!insideAny) {
        vertices.push(offsetCoord);
      }
    }
  }

  // Build edges between all visible vertex pairs
  const n = vertices.length;
  const edges: { from: number; to: number; dist: number }[] = [];

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (!lineIntersectsObstacles(vertices[i], vertices[j], obstacles)) {
        const d = distance(vertices[i], vertices[j], { units });
        edges.push({ from: i, to: j, dist: d });
        edges.push({ from: j, to: i, dist: d });
      }
    }
  }

  // Dijkstra from vertex 0 (start) to vertex 1 (end)
  const dist = new Array(n).fill(Infinity);
  const prev = new Array(n).fill(-1);
  const visited = new Array(n).fill(false);
  dist[0] = 0;

  // Build adjacency list
  const adj: { to: number; dist: number }[][] = Array.from(
    { length: n },
    () => []
  );
  for (const edge of edges) {
    adj[edge.from].push({ to: edge.to, dist: edge.dist });
  }

  for (let iter = 0; iter < n; iter++) {
    // Find unvisited vertex with minimum distance
    let u = -1;
    let minDist = Infinity;
    for (let i = 0; i < n; i++) {
      if (!visited[i] && dist[i] < minDist) {
        minDist = dist[i];
        u = i;
      }
    }
    if (u === -1 || u === 1) break;

    visited[u] = true;

    for (const edge of adj[u]) {
      const newDist = dist[u] + edge.dist;
      if (newDist < dist[edge.to]) {
        dist[edge.to] = newDist;
        prev[edge.to] = u;
      }
    }
  }

  // Reconstruct path
  if (dist[1] === Infinity) {
    // No path found, return straight line as fallback
    return lineString([startCoord, endCoord]);
  }

  const path: Coordinate[] = [];
  let current = 1;
  while (current !== -1) {
    path.unshift(vertices[current]);
    current = prev[current];
  }

  return lineString(path);
}

function lineIntersectsObstacles(
  a: Coordinate,
  b: Coordinate,
  obstacles: FeatureCollection<Polygon>
): boolean {
  for (const obstacle of obstacles.features) {
    const ring = obstacle.geometry.coordinates[0] as Coordinate[];
    for (let i = 0; i < ring.length - 1; i++) {
      if (segmentsIntersect(a, b, ring[i], ring[i + 1])) {
        return true;
      }
    }
    // Also check if the midpoint is strictly inside an obstacle (boundary is OK)
    const mid: Coordinate = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    if (booleanPointInPolygon(mid, obstacle, { ignoreBoundary: true })) {
      return true;
    }
  }
  return false;
}

function segmentsIntersect(
  a1: Coordinate,
  a2: Coordinate,
  b1: Coordinate,
  b2: Coordinate
): boolean {
  const dx1 = a2[0] - a1[0];
  const dy1 = a2[1] - a1[1];
  const dx2 = b2[0] - b1[0];
  const dy2 = b2[1] - b1[1];

  const denom = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denom) < 1e-10) return false;

  const t = ((b1[0] - a1[0]) * dy2 - (b1[1] - a1[1]) * dx2) / denom;
  const u = ((b1[0] - a1[0]) * dy1 - (b1[1] - a1[1]) * dx1) / denom;

  return t > 0.001 && t < 0.999 && u > 0.001 && u < 0.999;
}
