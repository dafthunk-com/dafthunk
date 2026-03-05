import type {
  Coordinate,
  Feature,
  FeatureCollection,
  LineString,
  MultiLineString,
  MultiPolygon,
  Point,
  Polygon,
  Units,
} from "./types";
import { featureCollection, getCoord, lineString, point, polygon } from "./helpers";
import { bearing, distance } from "./measurement";
import { destination } from "./geometry";

export function lineSlice(
  startPt: Feature<Point> | Point | number[],
  stopPt: Feature<Point> | Point | number[],
  line: Feature<LineString> | LineString,
): Feature<LineString> {
  const coords = getLineCoords(line);
  const start = nearestPointOnLineCoords(coords, getCoord(startPt));
  const stop = nearestPointOnLineCoords(coords, getCoord(stopPt));

  let startIdx = start.index;
  let stopIdx = stop.index;
  const startCoord = start.point;
  const stopCoord = stop.point;

  if (startIdx > stopIdx || (startIdx === stopIdx && start.t > stop.t)) {
    // Swap
    [startIdx, stopIdx] = [stopIdx, startIdx];
    const tmp = startCoord;
    startCoord[0] = stopCoord[0];
    startCoord[1] = stopCoord[1];
    stopCoord[0] = tmp[0];
    stopCoord[1] = tmp[1];
  }

  const sliced: Coordinate[] = [startCoord as Coordinate];
  for (let i = startIdx + 1; i <= stopIdx; i++) {
    sliced.push(coords[i]);
  }
  sliced.push(stopCoord as Coordinate);

  return lineString(sliced);
}

export function lineSliceAlong(
  line: Feature<LineString> | LineString,
  startDist: number,
  stopDist: number,
  options?: { units?: Units },
): Feature<LineString> {
  const coords = getLineCoords(line);
  const sliced: Coordinate[] = [];
  let travelled = 0;
  let started = false;

  for (let i = 0; i < coords.length; i++) {
    if (i > 0) {
      const segDist = distance(coords[i - 1] as number[], coords[i] as number[], options);

      if (!started && travelled + segDist >= startDist) {
        const overshoot = startDist - travelled;
        const direction = bearing(coords[i - 1] as number[], coords[i] as number[]);
        const startPoint = destination(coords[i - 1] as number[], overshoot, direction, options);
        sliced.push(startPoint.geometry.coordinates);
        started = true;
      }

      if (started && travelled + segDist >= stopDist) {
        const overshoot = stopDist - travelled;
        const direction = bearing(coords[i - 1] as number[], coords[i] as number[]);
        const endPoint = destination(coords[i - 1] as number[], overshoot, direction, options);
        sliced.push(endPoint.geometry.coordinates);
        return lineString(sliced);
      }

      if (started) {
        sliced.push(coords[i]);
      }

      travelled += segDist;
    }

    if (i === 0 && startDist === 0) {
      sliced.push(coords[0]);
      started = true;
    }
  }

  // If we haven't reached the stop distance, use the last coordinate
  if (sliced.length < 2) {
    sliced.push(coords[coords.length - 1]);
  }
  return lineString(sliced);
}

export function lineChunk(
  geojson: Feature<LineString> | LineString,
  segmentLength: number,
  options?: { units?: Units; reverse?: boolean },
): FeatureCollection<LineString> {
  const coords = getLineCoords(geojson);
  if (options?.reverse) coords.reverse();

  const chunks: Feature<LineString>[] = [];
  let currentChunk: Coordinate[] = [coords[0]];
  let remaining = segmentLength;

  for (let i = 0; i < coords.length - 1; i++) {
    const segDist = distance(coords[i] as number[], coords[i + 1] as number[], options);
    let dist = segDist;
    let from = coords[i];

    while (dist >= remaining) {
      const direction = bearing(from as number[], coords[i + 1] as number[]);
      const endPoint = destination(from as number[], remaining, direction, options);
      currentChunk.push(endPoint.geometry.coordinates);
      chunks.push(lineString(currentChunk));
      currentChunk = [endPoint.geometry.coordinates];
      dist -= remaining;
      remaining = segmentLength;
      from = endPoint.geometry.coordinates;
    }

    if (dist > 0) {
      currentChunk.push(coords[i + 1]);
      remaining -= dist;
    }
  }

  if (currentChunk.length >= 2) {
    chunks.push(lineString(currentChunk));
  }

  return featureCollection(chunks);
}

export function lineOffset(
  geojson: Feature<LineString> | LineString,
  offsetDistance: number,
  options?: { units?: Units },
): Feature<LineString> {
  const coords = getLineCoords(geojson);
  const result: Coordinate[] = [];

  for (let i = 0; i < coords.length; i++) {
    let bear: number;
    if (i === 0) {
      bear = bearing(coords[0] as number[], coords[1] as number[]);
    } else if (i === coords.length - 1) {
      bear = bearing(coords[i - 1] as number[], coords[i] as number[]);
    } else {
      const bear1 = bearing(coords[i - 1] as number[], coords[i] as number[]);
      const bear2 = bearing(coords[i] as number[], coords[i + 1] as number[]);
      bear = (bear1 + bear2) / 2;
    }

    const perpBear = bear + 90;
    const dest = destination(coords[i] as number[], offsetDistance, perpBear, options);
    result.push(dest.geometry.coordinates);
  }

  return lineString(result);
}

export function lineSegment(
  geojson: Feature<LineString | MultiLineString | Polygon | MultiPolygon> | LineString | MultiLineString | Polygon | MultiPolygon | FeatureCollection,
): FeatureCollection<LineString> {
  const segments: Feature<LineString>[] = [];

  function processCoords(coords: Coordinate[]): void {
    for (let i = 0; i < coords.length - 1; i++) {
      segments.push(lineString([coords[i], coords[i + 1]]));
    }
  }

  function processGeom(geom: { type: string; coordinates?: Coordinate | Coordinate[] | Coordinate[][] | Coordinate[][][] }): void {
    switch (geom.type) {
      case "LineString":
        processCoords(geom.coordinates as Coordinate[]);
        break;
      case "MultiLineString":
      case "Polygon":
        for (const ring of geom.coordinates as Coordinate[][]) processCoords(ring);
        break;
      case "MultiPolygon":
        for (const poly of geom.coordinates as Coordinate[][][]) {
          for (const ring of poly) processCoords(ring);
        }
        break;
    }
  }

  if (geojson.type === "FeatureCollection") {
    for (const feat of (geojson as FeatureCollection).features) {
      processGeom(feat.geometry);
    }
  } else if (geojson.type === "Feature") {
    processGeom((geojson as Feature).geometry);
  } else {
    processGeom(geojson as LineString | MultiLineString | Polygon | MultiPolygon);
  }

  return featureCollection(segments);
}

export function lineSplit(
  line: Feature<LineString> | LineString,
  splitter: Feature<Point> | Point,
): FeatureCollection<LineString> {
  const coords = getLineCoords(line);
  const pt = getCoord(splitter);
  const nearest = nearestPointOnLineCoords(coords, pt);

  const firstPart: Coordinate[] = [];
  for (let i = 0; i <= nearest.index; i++) {
    firstPart.push(coords[i]);
  }
  firstPart.push(nearest.point as Coordinate);

  const secondPart: Coordinate[] = [nearest.point as Coordinate];
  for (let i = nearest.index + 1; i < coords.length; i++) {
    secondPart.push(coords[i]);
  }

  const results: Feature<LineString>[] = [];
  if (firstPart.length >= 2) results.push(lineString(firstPart));
  if (secondPart.length >= 2) results.push(lineString(secondPart));

  return featureCollection(results);
}

export function lineOverlap(
  line1: Feature<LineString | MultiLineString | Polygon | MultiPolygon>,
  line2: Feature<LineString | MultiLineString | Polygon | MultiPolygon>,
  options?: { tolerance?: number },
): FeatureCollection<LineString> {
  const tolerance = options?.tolerance ?? 0;

  const segs1 = lineSegment(line1).features;
  const segs2 = lineSegment(line2).features;

  const overlapping: Feature<LineString>[] = [];

  for (const s1 of segs1) {
    for (const s2 of segs2) {
      const c1 = s1.geometry.coordinates;
      const c2 = s2.geometry.coordinates;

      // Check if segments overlap (share the same path)
      const d1Start = pointToSegmentDistance(c1[0], c2[0], c2[1]);
      const d1End = pointToSegmentDistance(c1[1], c2[0], c2[1]);
      const d2Start = pointToSegmentDistance(c2[0], c1[0], c1[1]);
      const d2End = pointToSegmentDistance(c2[1], c1[0], c1[1]);

      if (d1Start <= tolerance && d1End <= tolerance && d2Start <= tolerance && d2End <= tolerance) {
        overlapping.push(s1);
      }
    }
  }

  return featureCollection(overlapping);
}

export function lineIntersect(
  line1: Feature<LineString | MultiLineString | Polygon | MultiPolygon> | FeatureCollection,
  line2: Feature<LineString | MultiLineString | Polygon | MultiPolygon> | FeatureCollection,
): FeatureCollection<Point> {
  const segs1 = lineSegment(line1 as Feature<LineString>).features;
  const segs2 = lineSegment(line2 as Feature<LineString>).features;
  const intersections: Feature<Point>[] = [];
  const seen = new Set<string>();

  for (const s1 of segs1) {
    for (const s2 of segs2) {
      const inter = segmentIntersection(
        s1.geometry.coordinates[0],
        s1.geometry.coordinates[1],
        s2.geometry.coordinates[0],
        s2.geometry.coordinates[1],
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

export function lineToPolygon(
  line: Feature<LineString | MultiLineString> | LineString | MultiLineString | FeatureCollection<LineString>,
  options?: { properties?: Record<string, unknown>; autoComplete?: boolean; orderCoords?: boolean },
): Feature<Polygon | MultiPolygon> {
  const autoComplete = options?.autoComplete ?? true;

  if (line.type === "FeatureCollection") {
    const rings: Coordinate[][] = [];
    for (const feat of (line as FeatureCollection<LineString>).features) {
      const coords = [...(feat.geometry.coordinates as Coordinate[])];
      if (autoComplete && !coordsEqual(coords[0], coords[coords.length - 1])) {
        coords.push(coords[0]);
      }
      rings.push(coords);
    }
    if (rings.length === 1) {
      return polygon(rings, options?.properties);
    }
    return {
      type: "Feature",
      properties: options?.properties ?? {},
      geometry: { type: "MultiPolygon", coordinates: rings.map((r) => [r]) as Coordinate[][][] },
    } as Feature<MultiPolygon>;
  }

  const geom = line.type === "Feature" ? (line as Feature).geometry : line;

  if (geom.type === "MultiLineString") {
    const rings: Coordinate[][] = [];
    for (const coords of (geom as MultiLineString).coordinates) {
      const ring = [...coords] as Coordinate[];
      if (autoComplete && !coordsEqual(ring[0], ring[ring.length - 1])) {
        ring.push(ring[0]);
      }
      rings.push(ring);
    }
    if (rings.length === 1) {
      return polygon(rings, options?.properties);
    }
    return {
      type: "Feature",
      properties: options?.properties ?? {},
      geometry: { type: "MultiPolygon", coordinates: rings.map((r) => [r]) as Coordinate[][][] },
    } as Feature<MultiPolygon>;
  }

  const coords = [...(geom as LineString).coordinates] as Coordinate[];
  if (autoComplete && !coordsEqual(coords[0], coords[coords.length - 1])) {
    coords.push(coords[0]);
  }
  return polygon([coords], options?.properties);
}

export function polygonToLine(
  poly: Feature<Polygon | MultiPolygon> | Polygon | MultiPolygon,
  options?: { properties?: Record<string, unknown> },
): Feature<LineString> | FeatureCollection<LineString> {
  const geom = poly.type === "Feature" ? (poly as Feature).geometry : poly;
  const props = options?.properties ?? (poly.type === "Feature" ? (poly as Feature).properties : {});

  if (geom.type === "Polygon") {
    const coords = (geom as Polygon).coordinates as Coordinate[][];
    if (coords.length === 1) {
      return lineString(coords[0], props ?? {});
    }
    const lines = coords.map((ring) => lineString(ring, props ?? {}));
    return featureCollection(lines);
  }

  // MultiPolygon
  const lines: Feature<LineString>[] = [];
  for (const polyCoords of (geom as MultiPolygon).coordinates) {
    for (const ring of polyCoords as Coordinate[][]) {
      lines.push(lineString(ring, props ?? {}));
    }
  }
  if (lines.length === 1) return lines[0];
  return featureCollection(lines);
}

// Internal helpers

function getLineCoords(line: Feature<LineString> | LineString): Coordinate[] {
  if (line.type === "Feature") return (line as Feature<LineString>).geometry.coordinates as Coordinate[];
  return (line as LineString).coordinates as Coordinate[];
}

function nearestPointOnLineCoords(
  coords: Coordinate[],
  pt: number[],
): { point: number[]; index: number; t: number } {
  let minDist = Infinity;
  let bestPoint = coords[0] as number[];
  let bestIndex = 0;
  let bestT = 0;

  for (let i = 0; i < coords.length - 1; i++) {
    const proj = projectPointOnSegment(pt, coords[i], coords[i + 1]);
    const d = sqDist(pt, proj.point);
    if (d < minDist) {
      minDist = d;
      bestPoint = proj.point;
      bestIndex = i;
      bestT = proj.t;
    }
  }

  return { point: bestPoint, index: bestIndex, t: bestT };
}

function projectPointOnSegment(
  p: number[],
  a: Coordinate,
  b: Coordinate,
): { point: number[]; t: number } {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  if (dx === 0 && dy === 0) return { point: [a[0], a[1]], t: 0 };

  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t));

  return {
    point: [a[0] + t * dx, a[1] + t * dy],
    t,
  };
}

function sqDist(a: number[], b: number[]): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
}

function segmentIntersection(
  a1: Coordinate,
  a2: Coordinate,
  b1: Coordinate,
  b2: Coordinate,
): number[] | null {
  const dx1 = a2[0] - a1[0];
  const dy1 = a2[1] - a1[1];
  const dx2 = b2[0] - b1[0];
  const dy2 = b2[1] - b1[1];

  const denom = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denom) < 1e-10) return null;

  const t = ((b1[0] - a1[0]) * dy2 - (b1[1] - a1[1]) * dx2) / denom;
  const u = ((b1[0] - a1[0]) * dy1 - (b1[1] - a1[1]) * dx1) / denom;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return [a1[0] + t * dx1, a1[1] + t * dy1];
  }

  return null;
}

function pointToSegmentDistance(p: Coordinate, a: Coordinate, b: Coordinate): number {
  const proj = projectPointOnSegment(p as number[], a, b);
  return Math.sqrt(sqDist(p as number[], proj.point));
}

function coordsEqual(a: Coordinate, b: Coordinate): boolean {
  return a[0] === b[0] && a[1] === b[1];
}
