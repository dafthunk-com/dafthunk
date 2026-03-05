import type {
  Coordinate,
  Feature,
  FeatureCollection,
  LineString,
  MultiLineString,
  Point,
  Polygon,
} from "./types";
import { featureCollection, lineString, point, polygon } from "./helpers";

export function kinks(
  poly: Feature<Polygon | LineString | MultiLineString> | Polygon | LineString | MultiLineString,
): FeatureCollection<Point> {
  const geom = poly.type === "Feature" ? (poly as Feature).geometry : poly;
  const intersections: Feature<Point>[] = [];

  function getSegments(): [Coordinate, Coordinate][] {
    const segs: [Coordinate, Coordinate][] = [];
    function addLine(coords: Coordinate[]): void {
      for (let i = 0; i < coords.length - 1; i++) {
        segs.push([coords[i], coords[i + 1]]);
      }
    }
    switch (geom.type) {
      case "LineString":
        addLine(geom.coordinates as Coordinate[]);
        break;
      case "MultiLineString":
        for (const line of geom.coordinates as Coordinate[][]) addLine(line);
        break;
      case "Polygon":
        for (const ring of (geom as Polygon).coordinates as Coordinate[][]) addLine(ring);
        break;
    }
    return segs;
  }

  const segments = getSegments();
  const seen = new Set<string>();

  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 2; j < segments.length; j++) {
      // Skip adjacent segments (they share an endpoint)
      if (j === i + 1) continue;

      const inter = segmentIntersection(
        segments[i][0], segments[i][1],
        segments[j][0], segments[j][1],
      );
      if (inter) {
        const key = `${inter[0].toFixed(10)},${inter[1].toFixed(10)}`;
        if (!seen.has(key)) {
          seen.add(key);
          intersections.push(point(inter));
        }
      }
    }
  }

  return featureCollection(intersections);
}

export function unkinkPolygon(
  poly: Feature<Polygon> | Polygon | FeatureCollection<Polygon>,
): FeatureCollection<Polygon> {
  const result: Feature<Polygon>[] = [];

  function processPolygon(feat: Feature<Polygon>): void {
    const selfIntersections = kinks(feat);
    if (selfIntersections.features.length === 0) {
      result.push(feat);
      return;
    }

    // Simple approach: split the polygon at self-intersections
    // For complex cases, this is a basic implementation
    const coords = feat.geometry.coordinates[0] as Coordinate[];
    const splitPolygons = splitSelfIntersecting(coords);
    for (const ring of splitPolygons) {
      if (ring.length >= 4) {
        result.push(polygon([ring], feat.properties ?? {}));
      }
    }
  }

  if (poly.type === "FeatureCollection") {
    for (const feat of (poly as FeatureCollection<Polygon>).features) {
      processPolygon(feat);
    }
  } else if (poly.type === "Feature") {
    processPolygon(poly as Feature<Polygon>);
  } else {
    processPolygon({ type: "Feature", properties: {}, geometry: poly as Polygon });
  }

  return featureCollection(result);
}

export function polygonize(
  lines: FeatureCollection<LineString>,
): FeatureCollection<Polygon> {
  const result: Feature<Polygon>[] = [];

  // Build a graph of edges
  const nodeMap = new Map<string, { coord: Coordinate; neighbors: string[] }>();

  for (const feat of lines.features) {
    const coords = feat.geometry.coordinates as Coordinate[];
    for (let i = 0; i < coords.length - 1; i++) {
      const aKey = coordKey(coords[i]);
      const bKey = coordKey(coords[i + 1]);

      if (!nodeMap.has(aKey)) nodeMap.set(aKey, { coord: coords[i], neighbors: [] });
      if (!nodeMap.has(bKey)) nodeMap.set(bKey, { coord: coords[i + 1], neighbors: [] });

      nodeMap.get(aKey)!.neighbors.push(bKey);
      nodeMap.get(bKey)!.neighbors.push(aKey);
    }
  }

  // Find minimal cycles (simple polygon detection)
  const visitedEdges = new Set<string>();
  const polygons: Coordinate[][] = [];

  for (const [nodeKey, node] of nodeMap) {
    for (const neighborKey of node.neighbors) {
      const edgeKey = edgeKeyStr(nodeKey, neighborKey);
      if (visitedEdges.has(edgeKey)) continue;

      const cycle = findMinimalCycle(nodeKey, neighborKey, nodeMap, visitedEdges);
      if (cycle) {
        polygons.push(cycle);
      }
    }
  }

  for (const ring of polygons) {
    if (ring.length >= 4) {
      result.push(polygon([ring]));
    }
  }

  return featureCollection(result);
}

// Internal helpers

function segmentIntersection(
  a1: Coordinate, a2: Coordinate,
  b1: Coordinate, b2: Coordinate,
): number[] | null {
  const dx1 = a2[0] - a1[0];
  const dy1 = a2[1] - a1[1];
  const dx2 = b2[0] - b1[0];
  const dy2 = b2[1] - b1[1];

  const denom = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denom) < 1e-10) return null;

  const t = ((b1[0] - a1[0]) * dy2 - (b1[1] - a1[1]) * dx2) / denom;
  const u = ((b1[0] - a1[0]) * dy1 - (b1[1] - a1[1]) * dx1) / denom;

  if (t > 0 && t < 1 && u > 0 && u < 1) {
    return [a1[0] + t * dx1, a1[1] + t * dy1];
  }

  return null;
}

function splitSelfIntersecting(ring: Coordinate[]): Coordinate[][] {
  // Simple approach: detect self-intersections and split
  // For a robust implementation, we'd need a proper polygon splitting algorithm
  // Here we return the ring as-is if splitting is too complex
  const result: Coordinate[][] = [];
  const segs: [Coordinate, Coordinate, number][] = [];

  for (let i = 0; i < ring.length - 1; i++) {
    segs.push([ring[i], ring[i + 1], i]);
  }

  // Find intersection points and their segment indices
  const intersections: { point: number[]; segI: number; segJ: number }[] = [];
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 2; j < segs.length; j++) {
      if (i === 0 && j === segs.length - 1) continue; // Skip first-last (they share a vertex)
      const inter = segmentIntersection(segs[i][0], segs[i][1], segs[j][0], segs[j][1]);
      if (inter) {
        intersections.push({ point: inter, segI: i, segJ: j });
      }
    }
  }

  if (intersections.length === 0) {
    result.push(ring);
    return result;
  }

  // Simple split: take segments between first intersection
  const inter = intersections[0];
  const ring1: Coordinate[] = [inter.point as Coordinate];
  for (let i = inter.segI + 1; i <= inter.segJ; i++) {
    ring1.push(ring[i]);
  }
  ring1.push(inter.point as Coordinate);

  const ring2: Coordinate[] = [inter.point as Coordinate];
  for (let i = inter.segJ + 1; i < ring.length - 1; i++) {
    ring2.push(ring[i]);
  }
  for (let i = 0; i <= inter.segI; i++) {
    ring2.push(ring[i]);
  }
  ring2.push(inter.point as Coordinate);

  if (ring1.length >= 4) result.push(ring1);
  if (ring2.length >= 4) result.push(ring2);

  if (result.length === 0) result.push(ring);
  return result;
}

function coordKey(coord: Coordinate): string {
  return `${coord[0].toFixed(10)},${coord[1].toFixed(10)}`;
}

function edgeKeyStr(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function findMinimalCycle(
  startKey: string,
  nextKey: string,
  nodeMap: Map<string, { coord: Coordinate; neighbors: string[] }>,
  visitedEdges: Set<string>,
): Coordinate[] | null {
  const path: string[] = [startKey, nextKey];
  const visited = new Set<string>([startKey, nextKey]);
  visitedEdges.add(edgeKeyStr(startKey, nextKey));

  let current = nextKey;
  const maxSteps = 1000;
  let steps = 0;

  while (steps++ < maxSteps) {
    const node = nodeMap.get(current);
    if (!node) return null;

    // Try to find the next node using leftmost turn
    const prev = path[path.length - 2];
    let bestNext: string | null = null;
    let bestAngle = -Infinity;

    for (const neighbor of node.neighbors) {
      if (neighbor === prev) continue;
      const edgeKey = edgeKeyStr(current, neighbor);
      if (visitedEdges.has(edgeKey) && neighbor !== startKey) continue;

      const prevNode = nodeMap.get(prev)!;
      const currNode = nodeMap.get(current)!;
      const nextNode = nodeMap.get(neighbor)!;

      const angle = angleBetween(prevNode.coord, currNode.coord, nextNode.coord);
      if (angle > bestAngle) {
        bestAngle = angle;
        bestNext = neighbor;
      }
    }

    if (!bestNext) return null;

    if (bestNext === startKey) {
      // Found a cycle
      visitedEdges.add(edgeKeyStr(current, bestNext));
      const ring: Coordinate[] = path.map((k) => nodeMap.get(k)!.coord);
      ring.push(ring[0]); // Close
      return ring;
    }

    if (visited.has(bestNext)) return null;

    visitedEdges.add(edgeKeyStr(current, bestNext));
    visited.add(bestNext);
    path.push(bestNext);
    current = bestNext;
  }

  return null;
}

function angleBetween(prev: Coordinate, curr: Coordinate, next: Coordinate): number {
  const angle1 = Math.atan2(prev[1] - curr[1], prev[0] - curr[0]);
  const angle2 = Math.atan2(next[1] - curr[1], next[0] - curr[0]);
  let diff = angle2 - angle1;
  if (diff < 0) diff += 2 * Math.PI;
  return diff;
}
