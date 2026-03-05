import { getCoord } from "./helpers";
import type {
  Coordinate,
  Feature,
  FeatureCollection,
  Geometry,
  GeometryCollection,
  LineString,
  MultiLineString,
  MultiPoint,
  MultiPolygon,
  Point,
  Polygon,
} from "./types";

type AnyGeoJSON = Geometry | GeometryCollection | Feature | FeatureCollection;

function getGeom(geojson: AnyGeoJSON): Geometry | GeometryCollection {
  if (geojson.type === "Feature") return (geojson as Feature).geometry;
  return geojson as Geometry | GeometryCollection;
}

function _getCoords(
  geom: Geometry
): Coordinate | Coordinate[] | Coordinate[][] | Coordinate[][][] {
  return geom.coordinates;
}

export function booleanClockwise(
  line: Feature<LineString> | LineString | Coordinate[]
): boolean {
  let ring: Coordinate[];
  if (Array.isArray(line) && Array.isArray(line[0])) {
    ring = line as Coordinate[];
  } else {
    const geom =
      (line as Feature<LineString>).type === "Feature"
        ? (line as Feature<LineString>).geometry
        : (line as LineString);
    ring = geom.coordinates as Coordinate[];
  }

  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    sum += (ring[i + 1][0] - ring[i][0]) * (ring[i + 1][1] + ring[i][1]);
  }
  return sum > 0;
}

export function booleanConcave(poly: Feature<Polygon> | Polygon): boolean {
  const geom = getGeom(poly) as Polygon;
  const ring = geom.coordinates[0] as Coordinate[];
  const n = ring.length - 1;
  if (n < 4) return false;

  let sign = 0;
  for (let i = 0; i < n; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % n];
    const c = ring[(i + 2) % n];
    const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (cross !== 0) {
      if (sign === 0) {
        sign = cross > 0 ? 1 : -1;
      } else if ((cross > 0 ? 1 : -1) !== sign) {
        return true;
      }
    }
  }
  return false;
}

export function booleanContains(
  feature1: Feature | Geometry,
  feature2: Feature | Geometry
): boolean {
  const geom1 = getGeom(feature1 as AnyGeoJSON);
  const geom2 = getGeom(feature2 as AnyGeoJSON);

  if (geom2.type === "Point") {
    const pt = (geom2 as Point).coordinates;
    if (geom1.type === "Polygon") {
      return pointInPolygon(
        pt,
        (geom1 as Polygon).coordinates as Coordinate[][]
      );
    }
    if (geom1.type === "MultiPolygon") {
      for (const poly of (geom1 as MultiPolygon).coordinates) {
        if (pointInPolygon(pt, poly as Coordinate[][])) return true;
      }
      return false;
    }
    if (geom1.type === "Point") {
      return (
        pt[0] === (geom1 as Point).coordinates[0] &&
        pt[1] === (geom1 as Point).coordinates[1]
      );
    }
  }

  // For complex cases, use bounding box check + detailed check
  if (geom2.type === "Polygon" && geom1.type === "Polygon") {
    const ring2 = (geom2 as Polygon).coordinates[0] as Coordinate[];
    for (const coord of ring2) {
      if (
        !pointInPolygon(coord, (geom1 as Polygon).coordinates as Coordinate[][])
      ) {
        return false;
      }
    }
    return true;
  }

  if (geom2.type === "LineString" && geom1.type === "Polygon") {
    const coords2 = (geom2 as LineString).coordinates as Coordinate[];
    for (const coord of coords2) {
      if (
        !pointInPolygon(coord, (geom1 as Polygon).coordinates as Coordinate[][])
      ) {
        return false;
      }
    }
    return true;
  }

  return false;
}

export function booleanCrosses(
  feature1: Feature | Geometry,
  feature2: Feature | Geometry
): boolean {
  const geom1 = getGeom(feature1 as AnyGeoJSON);
  const geom2 = getGeom(feature2 as AnyGeoJSON);

  if (geom1.type === "LineString" && geom2.type === "LineString") {
    const coords1 = (geom1 as LineString).coordinates as Coordinate[];
    const coords2 = (geom2 as LineString).coordinates as Coordinate[];

    for (let i = 0; i < coords1.length - 1; i++) {
      for (let j = 0; j < coords2.length - 1; j++) {
        if (
          segmentsIntersect(
            coords1[i],
            coords1[i + 1],
            coords2[j],
            coords2[j + 1]
          )
        ) {
          return true;
        }
      }
    }
  }

  if (geom1.type === "MultiPoint" && geom2.type === "Polygon") {
    let inside = false;
    let outside = false;
    for (const coord of (geom1 as MultiPoint).coordinates) {
      if (
        pointInPolygon(coord, (geom2 as Polygon).coordinates as Coordinate[][])
      ) {
        inside = true;
      } else {
        outside = true;
      }
      if (inside && outside) return true;
    }
  }

  if (geom1.type === "LineString" && geom2.type === "Polygon") {
    const coords = (geom1 as LineString).coordinates as Coordinate[];
    const polyCoords = (geom2 as Polygon).coordinates as Coordinate[][];
    let inside = false;
    let outside = false;

    // Check vertices
    for (const coord of coords) {
      if (pointInPolygon(coord, polyCoords, true)) {
        inside = true;
      } else {
        outside = true;
      }
      if (inside && outside) return true;
    }

    // If all vertices are outside, check if any line segment crosses polygon edges
    if (!inside) {
      for (let i = 0; i < coords.length - 1; i++) {
        for (const ring of polyCoords) {
          for (let j = 0; j < ring.length - 1; j++) {
            if (
              segmentsIntersect(coords[i], coords[i + 1], ring[j], ring[j + 1])
            ) {
              return true;
            }
          }
        }
      }
    }
  }

  return false;
}

export function booleanDisjoint(
  feature1: Feature | Geometry,
  feature2: Feature | Geometry
): boolean {
  return !booleanIntersects(feature1, feature2);
}

export function booleanEqual(
  feature1: Feature | Geometry,
  feature2: Feature | Geometry
): boolean {
  const geom1 = getGeom(feature1 as AnyGeoJSON);
  const geom2 = getGeom(feature2 as AnyGeoJSON);

  if (geom1.type !== geom2.type) return false;

  return (
    JSON.stringify(sortCoords(geom1)) === JSON.stringify(sortCoords(geom2))
  );
}

function sortCoords(
  geom: Geometry | GeometryCollection
): Geometry | GeometryCollection {
  return JSON.parse(JSON.stringify(geom));
}

export function booleanIntersects(
  feature1: Feature | Geometry,
  feature2: Feature | Geometry
): boolean {
  const geom1 = getGeom(feature1 as AnyGeoJSON);
  const geom2 = getGeom(feature2 as AnyGeoJSON);

  // Point vs Point
  if (geom1.type === "Point" && geom2.type === "Point") {
    return (
      (geom1 as Point).coordinates[0] === (geom2 as Point).coordinates[0] &&
      (geom1 as Point).coordinates[1] === (geom2 as Point).coordinates[1]
    );
  }

  // Point vs Polygon
  if (
    geom1.type === "Point" &&
    (geom2.type === "Polygon" || geom2.type === "MultiPolygon")
  ) {
    return booleanPointInPolygon(
      geom1 as Point,
      feature2 as Feature<Polygon | MultiPolygon>
    );
  }
  if (
    (geom1.type === "Polygon" || geom1.type === "MultiPolygon") &&
    geom2.type === "Point"
  ) {
    return booleanPointInPolygon(
      geom2 as Point,
      feature1 as Feature<Polygon | MultiPolygon>
    );
  }

  // Line vs Line
  if (geom1.type === "LineString" && geom2.type === "LineString") {
    return linesIntersect(
      (geom1 as LineString).coordinates as Coordinate[],
      (geom2 as LineString).coordinates as Coordinate[]
    );
  }

  // Line vs Polygon
  if (geom1.type === "LineString" && geom2.type === "Polygon") {
    return lineIntersectsPolygon(
      (geom1 as LineString).coordinates as Coordinate[],
      (geom2 as Polygon).coordinates as Coordinate[][]
    );
  }
  if (geom1.type === "Polygon" && geom2.type === "LineString") {
    return lineIntersectsPolygon(
      (geom2 as LineString).coordinates as Coordinate[],
      (geom1 as Polygon).coordinates as Coordinate[][]
    );
  }

  // Polygon vs Polygon
  if (geom1.type === "Polygon" && geom2.type === "Polygon") {
    return polygonsIntersect(
      (geom1 as Polygon).coordinates as Coordinate[][],
      (geom2 as Polygon).coordinates as Coordinate[][]
    );
  }

  // MultiPoint
  if (geom1.type === "MultiPoint") {
    for (const coord of (geom1 as MultiPoint).coordinates) {
      const pt: Point = { type: "Point", coordinates: coord };
      if (booleanIntersects(pt, feature2)) return true;
    }
    return false;
  }
  if (geom2.type === "MultiPoint") {
    for (const coord of (geom2 as MultiPoint).coordinates) {
      const pt: Point = { type: "Point", coordinates: coord };
      if (booleanIntersects(feature1, pt)) return true;
    }
    return false;
  }

  // Fallback: check bounding boxes overlap
  const bb1 = geomBBox(geom1);
  const bb2 = geomBBox(geom2);
  return bboxOverlap(bb1, bb2);
}

export function booleanOverlap(
  feature1: Feature | Geometry,
  feature2: Feature | Geometry
): boolean {
  const geom1 = getGeom(feature1 as AnyGeoJSON);
  const geom2 = getGeom(feature2 as AnyGeoJSON);

  if (geom1.type !== geom2.type) return false;

  // Same dimension check
  if (geom1.type === "Point" || geom1.type === "MultiPoint") return false;

  if (!booleanIntersects(feature1, feature2)) return false;
  if (booleanEqual(feature1, feature2)) return false;

  if (geom1.type === "LineString" && geom2.type === "LineString") {
    // Lines overlap if they share a segment but are not equal
    return (
      booleanIntersects(feature1, feature2) &&
      !booleanWithin(feature1, feature2) &&
      !booleanWithin(feature2, feature1)
    );
  }

  // Polygons overlap if they intersect but neither contains the other
  return (
    !booleanContains(feature1, feature2) && !booleanContains(feature2, feature1)
  );
}

export function booleanParallel(
  line1: Feature<LineString> | LineString,
  line2: Feature<LineString> | LineString
): boolean {
  const geom1 = getGeom(line1 as AnyGeoJSON) as LineString;
  const geom2 = getGeom(line2 as AnyGeoJSON) as LineString;
  const coords1 = geom1.coordinates as Coordinate[];
  const coords2 = geom2.coordinates as Coordinate[];

  // Calculate the overall bearing for each line
  const _bear1 = Math.atan2(
    coords1[coords1.length - 1][1] - coords1[0][1],
    coords1[coords1.length - 1][0] - coords1[0][0]
  );
  const _bear2 = Math.atan2(
    coords2[coords2.length - 1][1] - coords2[0][1],
    coords2[coords2.length - 1][0] - coords2[0][0]
  );

  // Segments per line and compare bearings
  for (let i = 0; i < coords1.length - 1; i++) {
    const segBear1 = segmentBearing(coords1[i], coords1[i + 1]);
    for (let j = 0; j < coords2.length - 1; j++) {
      const segBear2 = segmentBearing(coords2[j], coords2[j + 1]);
      const diff = Math.abs(segBear1 - segBear2) % 180;
      if (diff > 0.1 && diff < 179.9) return false;
    }
  }

  return true;
}

function segmentBearing(a: Coordinate, b: Coordinate): number {
  const dy = b[1] - a[1];
  const dx = b[0] - a[0];
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

export function booleanPointInPolygon(
  pt: Feature<Point> | Point | number[],
  poly: Feature<Polygon | MultiPolygon> | Polygon | MultiPolygon,
  options?: { ignoreBoundary?: boolean }
): boolean {
  const coord = Array.isArray(pt) ? pt : getCoord(pt as Feature<Point> | Point);
  const geom = getGeom(poly as AnyGeoJSON);
  const ignoreBoundary = options?.ignoreBoundary ?? false;

  if (geom.type === "Polygon") {
    return pointInPolygon(
      coord as Coordinate,
      (geom as Polygon).coordinates as Coordinate[][],
      ignoreBoundary
    );
  }

  if (geom.type === "MultiPolygon") {
    for (const polyCoords of (geom as MultiPolygon).coordinates) {
      if (
        pointInPolygon(
          coord as Coordinate,
          polyCoords as Coordinate[][],
          ignoreBoundary
        )
      ) {
        return true;
      }
    }
  }

  return false;
}

export function booleanPointOnLine(
  pt: Feature<Point> | Point | number[],
  line: Feature<LineString> | LineString,
  options?: { ignoreEndVertices?: boolean; epsilon?: number }
): boolean {
  const coord = Array.isArray(pt) ? pt : getCoord(pt as Feature<Point> | Point);
  const geom = getGeom(line as AnyGeoJSON) as LineString;
  const coords = geom.coordinates as Coordinate[];
  const epsilon = options?.epsilon ?? 0;

  for (let i = 0; i < coords.length - 1; i++) {
    if (options?.ignoreEndVertices) {
      if (i === 0 && coordsNearlyEqual(coord, coords[0], epsilon)) continue;
      if (
        i === coords.length - 2 &&
        coordsNearlyEqual(coord, coords[coords.length - 1], epsilon)
      )
        continue;
    }

    if (
      isPointOnSegment(coord as Coordinate, coords[i], coords[i + 1], epsilon)
    ) {
      return true;
    }
  }

  return false;
}

export function booleanTouches(
  feature1: Feature | Geometry,
  feature2: Feature | Geometry
): boolean {
  const geom1 = getGeom(feature1 as AnyGeoJSON);
  const geom2 = getGeom(feature2 as AnyGeoJSON);

  // Point touches polygon if it's on the boundary but not inside
  if (geom1.type === "Point" && geom2.type === "Polygon") {
    const coord = (geom1 as Point).coordinates;
    return (
      isPointOnBoundary(
        coord,
        (geom2 as Polygon).coordinates as Coordinate[][]
      ) &&
      !pointInPolygon(
        coord,
        (geom2 as Polygon).coordinates as Coordinate[][],
        true
      )
    );
  }

  if (geom1.type === "Polygon" && geom2.type === "Point") {
    const coord = (geom2 as Point).coordinates;
    return (
      isPointOnBoundary(
        coord,
        (geom1 as Polygon).coordinates as Coordinate[][]
      ) &&
      !pointInPolygon(
        coord,
        (geom1 as Polygon).coordinates as Coordinate[][],
        true
      )
    );
  }

  // Line touches polygon if at least one endpoint is on boundary but line interior doesn't cross
  if (geom1.type === "LineString" && geom2.type === "Polygon") {
    const coords = (geom1 as LineString).coordinates as Coordinate[];
    const polyCoords = (geom2 as Polygon).coordinates as Coordinate[][];
    const startOnBoundary = isPointOnBoundary(coords[0], polyCoords);
    const endOnBoundary = isPointOnBoundary(
      coords[coords.length - 1],
      polyCoords
    );
    if (!startOnBoundary && !endOnBoundary) return false;
    // Check no interior point is inside the polygon
    for (let i = 1; i < coords.length - 1; i++) {
      if (pointInPolygon(coords[i], polyCoords, true)) return false;
    }
    return true;
  }

  // Point touches line if it's on an endpoint
  if (geom1.type === "Point" && geom2.type === "LineString") {
    const coord = (geom1 as Point).coordinates;
    const lineCoords = (geom2 as LineString).coordinates as Coordinate[];
    return (
      coordsNearlyEqual(coord, lineCoords[0]) ||
      coordsNearlyEqual(coord, lineCoords[lineCoords.length - 1])
    );
  }

  if (geom1.type === "LineString" && geom2.type === "Point") {
    const coord = (geom2 as Point).coordinates;
    const lineCoords = (geom1 as LineString).coordinates as Coordinate[];
    return (
      coordsNearlyEqual(coord, lineCoords[0]) ||
      coordsNearlyEqual(coord, lineCoords[lineCoords.length - 1])
    );
  }

  return false;
}

export function booleanValid(feature: Feature | Geometry): boolean {
  const geom = getGeom(feature as AnyGeoJSON);

  switch (geom.type) {
    case "Point": {
      const coords = (geom as Point).coordinates;
      return (
        coords.length >= 2 &&
        coords.every((c) => typeof c === "number" && Number.isFinite(c))
      );
    }
    case "MultiPoint": {
      return (geom as MultiPoint).coordinates.every(
        (c) =>
          c.length >= 2 &&
          c.every((v) => typeof v === "number" && Number.isFinite(v))
      );
    }
    case "LineString": {
      const coords = (geom as LineString).coordinates;
      return coords.length >= 2;
    }
    case "MultiLineString": {
      return (geom as MultiLineString).coordinates.every(
        (line) => line.length >= 2
      );
    }
    case "Polygon": {
      const coords = (geom as Polygon).coordinates;
      return coords.every((ring) => {
        if (ring.length < 4) return false;
        const first = ring[0];
        const last = ring[ring.length - 1];
        return first[0] === last[0] && first[1] === last[1];
      });
    }
    case "MultiPolygon": {
      return (geom as MultiPolygon).coordinates.every((poly) =>
        (poly as Coordinate[][]).every((ring) => {
          if (ring.length < 4) return false;
          const first = ring[0];
          const last = ring[ring.length - 1];
          return first[0] === last[0] && first[1] === last[1];
        })
      );
    }
    case "GeometryCollection": {
      return (geom as GeometryCollection).geometries.every((g) =>
        booleanValid(g)
      );
    }
    default:
      return false;
  }
}

export function booleanWithin(
  feature1: Feature | Geometry,
  feature2: Feature | Geometry
): boolean {
  return booleanContains(feature2, feature1);
}

// ---- Internal helpers ----

function pointInPolygon(
  coord: Coordinate | number[],
  rings: Coordinate[][],
  ignoreBoundary = false
): boolean {
  const x = coord[0];
  const y = coord[1];
  const outerRing = rings[0];

  // Check boundary first (for all modes)
  for (let i = 0; i < outerRing.length - 1; i++) {
    if (isPointOnSegment(coord as Coordinate, outerRing[i], outerRing[i + 1])) {
      return !ignoreBoundary;
    }
  }

  // Ray casting
  let inside = false;
  for (let i = 0, j = outerRing.length - 1; i < outerRing.length; j = i++) {
    const yi = outerRing[i][1];
    const yj = outerRing[j][1];
    if (yi > y !== yj > y) {
      const xi = outerRing[i][0];
      const xj = outerRing[j][0];
      if (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
  }

  if (!inside) return false;

  // Check holes
  for (let h = 1; h < rings.length; h++) {
    const hole = rings[h];

    // Check hole boundary
    for (let i = 0; i < hole.length - 1; i++) {
      if (isPointOnSegment(coord as Coordinate, hole[i], hole[i + 1])) {
        return !ignoreBoundary;
      }
    }

    let inHole = false;
    for (let i = 0, j = hole.length - 1; i < hole.length; j = i++) {
      const yi = hole[i][1];
      const yj = hole[j][1];
      if (yi > y !== yj > y) {
        const xi = hole[i][0];
        const xj = hole[j][0];
        if (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
          inHole = !inHole;
        }
      }
    }
    if (inHole) return false;
  }

  return true;
}

function isPointOnSegment(
  p: Coordinate,
  a: Coordinate,
  b: Coordinate,
  epsilon = 0
): boolean {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lenSq = dx * dx + dy * dy;

  // Degenerate segment (a === b): check if p equals the point
  if (lenSq === 0) {
    return Math.abs(p[0] - a[0]) <= epsilon && Math.abs(p[1] - a[1]) <= epsilon;
  }

  const cross = dx * (p[1] - a[1]) - dy * (p[0] - a[0]);
  if (Math.abs(cross) > epsilon * Math.sqrt(lenSq) + 1e-10) return false;

  const dot = (p[0] - a[0]) * dx + (p[1] - a[1]) * dy;
  if (dot < -epsilon) return false;
  if (dot > lenSq + epsilon) return false;

  return true;
}

function isPointOnBoundary(coord: Coordinate, rings: Coordinate[][]): boolean {
  for (const ring of rings) {
    for (let i = 0; i < ring.length - 1; i++) {
      if (isPointOnSegment(coord, ring[i], ring[i + 1])) return true;
    }
  }
  return false;
}

function coordsNearlyEqual(
  a: Coordinate | number[],
  b: Coordinate | number[],
  epsilon = 0
): boolean {
  return Math.abs(a[0] - b[0]) <= epsilon && Math.abs(a[1] - b[1]) <= epsilon;
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

  return t > 0 && t < 1 && u > 0 && u < 1;
}

function linesIntersect(coords1: Coordinate[], coords2: Coordinate[]): boolean {
  for (let i = 0; i < coords1.length - 1; i++) {
    for (let j = 0; j < coords2.length - 1; j++) {
      if (
        segmentsIntersect(
          coords1[i],
          coords1[i + 1],
          coords2[j],
          coords2[j + 1]
        )
      ) {
        return true;
      }
    }
  }
  return false;
}

function lineIntersectsPolygon(
  lineCoords: Coordinate[],
  polyCoords: Coordinate[][]
): boolean {
  // Check if any line point is inside the polygon
  for (const coord of lineCoords) {
    if (pointInPolygon(coord, polyCoords)) return true;
  }
  // Check if any line segment intersects polygon edges
  for (const ring of polyCoords) {
    for (let i = 0; i < ring.length - 1; i++) {
      for (let j = 0; j < lineCoords.length - 1; j++) {
        if (
          segmentsIntersect(
            ring[i],
            ring[i + 1],
            lineCoords[j],
            lineCoords[j + 1]
          )
        ) {
          return true;
        }
      }
    }
  }
  return false;
}

function polygonsIntersect(
  coords1: Coordinate[][],
  coords2: Coordinate[][]
): boolean {
  // Check if any vertex of poly1 is inside poly2
  for (const coord of coords1[0]) {
    if (pointInPolygon(coord, coords2)) return true;
  }
  // Check if any vertex of poly2 is inside poly1
  for (const coord of coords2[0]) {
    if (pointInPolygon(coord, coords1)) return true;
  }
  // Check if any edges intersect
  for (const ring1 of coords1) {
    for (const ring2 of coords2) {
      for (let i = 0; i < ring1.length - 1; i++) {
        for (let j = 0; j < ring2.length - 1; j++) {
          if (
            segmentsIntersect(ring1[i], ring1[i + 1], ring2[j], ring2[j + 1])
          ) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

function geomBBox(
  geom: Geometry | GeometryCollection
): [number, number, number, number] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  function processCoords(
    coords: Coordinate | Coordinate[] | Coordinate[][] | Coordinate[][][]
  ): void {
    if (typeof coords[0] === "number") {
      const c = coords as Coordinate;
      if (c[0] < minX) minX = c[0];
      if (c[1] < minY) minY = c[1];
      if (c[0] > maxX) maxX = c[0];
      if (c[1] > maxY) maxY = c[1];
      return;
    }
    for (const c of coords as (Coordinate | Coordinate[] | Coordinate[][])[]) {
      processCoords(c as Coordinate);
    }
  }

  if (geom.type === "GeometryCollection") {
    for (const g of (geom as GeometryCollection).geometries) {
      const bb = geomBBox(g);
      if (bb[0] < minX) minX = bb[0];
      if (bb[1] < minY) minY = bb[1];
      if (bb[2] > maxX) maxX = bb[2];
      if (bb[3] > maxY) maxY = bb[3];
    }
  } else {
    processCoords((geom as Geometry).coordinates);
  }

  return [minX, minY, maxX, maxY];
}

function bboxOverlap(
  bb1: [number, number, number, number],
  bb2: [number, number, number, number]
): boolean {
  return (
    bb1[0] <= bb2[2] && bb1[2] >= bb2[0] && bb1[1] <= bb2[3] && bb1[3] >= bb2[1]
  );
}
