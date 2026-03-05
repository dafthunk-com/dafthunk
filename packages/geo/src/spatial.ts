import { bbox } from "./accessors";
import { booleanPointInPolygon } from "./booleans";
import { featureCollection, getCoord, point } from "./helpers";
import { distance } from "./measurement";
import type {
  Coordinate,
  Feature,
  FeatureCollection,
  Geometry,
  GeometryCollection,
  LineString,
  Point,
  Polygon,
  Units,
} from "./types";

type AnyGeoJSON = Geometry | GeometryCollection | Feature | FeatureCollection;

export function nearestPoint(
  targetPoint: Feature<Point> | Point | number[],
  points: FeatureCollection<Point>
): Feature<Point> & {
  properties: { featureIndex: number; distanceToPoint: number };
} {
  const target = getCoord(targetPoint);
  let minDist = Infinity;
  let bestIndex = 0;

  for (let i = 0; i < points.features.length; i++) {
    const d = distance(target, points.features[i]);
    if (d < minDist) {
      minDist = d;
      bestIndex = i;
    }
  }

  const best = points.features[bestIndex];
  const coord = getCoord(best);
  const result = point(coord, {
    ...best.properties,
    featureIndex: bestIndex,
    distanceToPoint: minDist,
  });

  return result as Feature<Point> & {
    properties: { featureIndex: number; distanceToPoint: number };
  };
}

export function nearestPointOnLine(
  lines: Feature<LineString> | LineString | FeatureCollection<LineString>,
  pt: Feature<Point> | Point | number[],
  options?: { units?: Units }
): Feature<Point> & {
  properties: {
    index: number;
    dist: number;
    location: number;
    multiFeatureIndex: number;
  };
} {
  const coord = getCoord(pt);
  let minDist = Infinity;
  let bestPoint: Coordinate = [0, 0];
  let bestIndex = 0;
  let bestLocation = 0;
  let bestMultiIndex = 0;

  function processLine(coords: Coordinate[], multiIndex: number): void {
    let location = 0;
    for (let i = 0; i < coords.length - 1; i++) {
      const proj = projectPointOnSegment(coord, coords[i], coords[i + 1]);
      const d = distance(coord, proj.point, options);

      if (d < minDist) {
        minDist = d;
        bestPoint = proj.point as Coordinate;
        bestIndex = i;
        bestLocation =
          location + distance(coords[i] as number[], proj.point, options);
        bestMultiIndex = multiIndex;
      }
      location += distance(
        coords[i] as number[],
        coords[i + 1] as number[],
        options
      );
    }
  }

  if (lines.type === "FeatureCollection") {
    const fc = lines as FeatureCollection<LineString>;
    for (let mi = 0; mi < fc.features.length; mi++) {
      processLine(fc.features[mi].geometry.coordinates as Coordinate[], mi);
    }
  } else {
    const geom =
      lines.type === "Feature"
        ? (lines as Feature<LineString>).geometry
        : (lines as LineString);
    processLine(geom.coordinates as Coordinate[], 0);
  }

  return point(bestPoint, {
    index: bestIndex,
    dist: minDist,
    location: bestLocation,
    multiFeatureIndex: bestMultiIndex,
  }) as Feature<Point> & {
    properties: {
      index: number;
      dist: number;
      location: number;
      multiFeatureIndex: number;
    };
  };
}

export function pointOnFeature(geojson: AnyGeoJSON): Feature<Point> {
  // Try centroid first, check if it's inside the geometry
  const bb = bbox(geojson);
  const centerX = (bb[0] + bb[2]) / 2;
  const centerY = (bb[1] + bb[3]) / 2;

  // For polygons, if centroid is inside, use it
  if (geojson.type === "Feature") {
    const geom = (geojson as Feature).geometry;
    if (geom.type === "Polygon") {
      if (
        booleanPointInPolygon([centerX, centerY], geojson as Feature<Polygon>)
      ) {
        return point([centerX, centerY]);
      }
    }
  }

  // For points, return the first one
  if (
    geojson.type === "Feature" &&
    (geojson as Feature).geometry.type === "Point"
  ) {
    return point((geojson as Feature<Point>).geometry.coordinates as number[]);
  }

  if (geojson.type === "FeatureCollection") {
    for (const feat of (geojson as FeatureCollection).features) {
      if (feat.geometry.type === "Point") {
        return point(feat.geometry.coordinates as number[]);
      }
    }
  }

  // Fallback to center of bbox
  return point([centerX, centerY]);
}

export function pointToLineDistance(
  pt: Feature<Point> | Point | number[],
  line: Feature<LineString> | LineString,
  options?: { units?: Units; method?: "geodesic" | "planar" }
): number {
  const coord = getCoord(pt);
  const geom =
    line.type === "Feature"
      ? (line as Feature<LineString>).geometry
      : (line as LineString);
  const coords = geom.coordinates as Coordinate[];

  let minDist = Infinity;
  for (let i = 0; i < coords.length - 1; i++) {
    const proj = projectPointOnSegment(coord, coords[i], coords[i + 1]);
    const d = distance(coord, proj.point, options);
    if (d < minDist) minDist = d;
  }

  return minDist;
}

export function pointToPolygonDistance(
  pt: Feature<Point> | Point | number[],
  poly: Feature<Polygon> | Polygon,
  options?: { units?: Units }
): number {
  const coord = getCoord(pt);
  const geom =
    poly.type === "Feature"
      ? (poly as Feature<Polygon>).geometry
      : (poly as Polygon);
  const rings = geom.coordinates as Coordinate[][];

  // If point is inside polygon, distance is negative (or 0)
  if (booleanPointInPolygon(coord, poly as Feature<Polygon>)) {
    // Find distance to nearest edge (negative)
    let minDist = Infinity;
    for (const ring of rings) {
      for (let i = 0; i < ring.length - 1; i++) {
        const proj = projectPointOnSegment(coord, ring[i], ring[i + 1]);
        const d = distance(coord, proj.point, options);
        if (d < minDist) minDist = d;
      }
    }
    return -minDist;
  }

  // Point is outside, find distance to nearest edge
  let minDist = Infinity;
  for (const ring of rings) {
    for (let i = 0; i < ring.length - 1; i++) {
      const proj = projectPointOnSegment(coord, ring[i], ring[i + 1]);
      const d = distance(coord, proj.point, options);
      if (d < minDist) minDist = d;
    }
  }
  return minDist;
}

export function polygonTangents(
  pt: Feature<Point> | Point | number[],
  poly: Feature<Polygon> | Polygon
): FeatureCollection<Point> {
  const coord = getCoord(pt);
  const geom =
    poly.type === "Feature"
      ? (poly as Feature<Polygon>).geometry
      : (poly as Polygon);
  const ring = geom.coordinates[0] as Coordinate[];
  const n = ring.length - 1; // Exclude closing point

  // Find two tangent points using rotation angle method
  let minAngle = Infinity;
  let maxAngle = -Infinity;
  let tangentMin: Coordinate = ring[0];
  let tangentMax: Coordinate = ring[0];

  for (let i = 0; i < n; i++) {
    const angle = Math.atan2(ring[i][1] - coord[1], ring[i][0] - coord[0]);
    if (angle < minAngle) {
      minAngle = angle;
      tangentMin = ring[i];
    }
    if (angle > maxAngle) {
      maxAngle = angle;
      tangentMax = ring[i];
    }
  }

  return featureCollection([
    point(tangentMin as number[]),
    point(tangentMax as number[]),
  ]);
}

export function centerMedian(
  features: FeatureCollection<Point>,
  options?: {
    weight?: string;
    tolerance?: number;
    counter?: number;
    properties?: Record<string, unknown>;
  }
): Feature<Point> {
  const tolerance = options?.tolerance ?? 0.001;
  const maxIterations = options?.counter ?? 10;

  // Start at centroid
  const coords: Coordinate[] = [];
  const weights: number[] = [];
  for (const feat of features.features) {
    const c = getCoord(feat);
    coords.push(c as Coordinate);
    const w =
      options?.weight && feat.properties
        ? (feat.properties as Record<string, unknown>)[options.weight]
        : 1;
    weights.push(typeof w === "number" ? w : 1);
  }

  // Initial estimate: weighted centroid
  let x = 0;
  let y = 0;
  let totalWeight = 0;
  for (let i = 0; i < coords.length; i++) {
    x += coords[i][0] * weights[i];
    y += coords[i][1] * weights[i];
    totalWeight += weights[i];
  }
  x /= totalWeight;
  y /= totalWeight;

  // Weiszfeld algorithm
  for (let iter = 0; iter < maxIterations; iter++) {
    let numX = 0;
    let numY = 0;
    let denom = 0;

    for (let i = 0; i < coords.length; i++) {
      const d = Math.sqrt((coords[i][0] - x) ** 2 + (coords[i][1] - y) ** 2);
      if (d < 1e-10) continue;
      const w = weights[i] / d;
      numX += coords[i][0] * w;
      numY += coords[i][1] * w;
      denom += w;
    }

    if (denom === 0) break;

    const newX = numX / denom;
    const newY = numY / denom;

    if (Math.abs(newX - x) < tolerance && Math.abs(newY - y) < tolerance) {
      x = newX;
      y = newY;
      break;
    }

    x = newX;
    y = newY;
  }

  return point([x, y], options?.properties);
}

export function polygonSmooth(
  geojson: FeatureCollection<Polygon> | Feature<Polygon> | Polygon,
  options?: { iterations?: number }
): FeatureCollection<Polygon> {
  const iterations = options?.iterations ?? 1;
  const features: Feature<Polygon>[] = [];

  function smoothFeature(feat: Feature<Polygon>): Feature<Polygon> {
    let coords = feat.geometry.coordinates as Coordinate[][];

    for (let iter = 0; iter < iterations; iter++) {
      const smoothed: Coordinate[][] = [];
      for (const ring of coords) {
        smoothed.push(chaikinSmooth(ring));
      }
      coords = smoothed;
    }

    return {
      type: "Feature",
      properties: feat.properties,
      geometry: { type: "Polygon", coordinates: coords },
    };
  }

  if (geojson.type === "FeatureCollection") {
    for (const feat of (geojson as FeatureCollection<Polygon>).features) {
      features.push(smoothFeature(feat));
    }
  } else if (geojson.type === "Feature") {
    features.push(smoothFeature(geojson as Feature<Polygon>));
  } else {
    features.push(
      smoothFeature({
        type: "Feature",
        properties: {},
        geometry: geojson as Polygon,
      })
    );
  }

  return featureCollection(features);
}

// Chaikin's corner-cutting algorithm
function chaikinSmooth(ring: Coordinate[]): Coordinate[] {
  const isRing =
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1];
  const coords = isRing ? ring.slice(0, -1) : ring;
  const result: Coordinate[] = [];

  for (let i = 0; i < coords.length - (isRing ? 0 : 1); i++) {
    const p0 = coords[i];
    const p1 = coords[(i + 1) % coords.length];

    const q: Coordinate = [
      0.75 * p0[0] + 0.25 * p1[0],
      0.75 * p0[1] + 0.25 * p1[1],
    ];
    const r: Coordinate = [
      0.25 * p0[0] + 0.75 * p1[0],
      0.25 * p0[1] + 0.75 * p1[1],
    ];

    result.push(q, r);
  }

  if (isRing) {
    result.push(result[0]); // Close ring
  }

  return result;
}

// Internal helpers
function projectPointOnSegment(
  p: number[],
  a: Coordinate,
  b: Coordinate
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
