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
import { degreesToRadians, lengthToRadians, radiansToDegrees, radiansToLength } from "./constants";
import { featureCollection, getCoord, point } from "./helpers";

type AnyGeoJSON = Geometry | GeometryCollection | Feature | FeatureCollection;

export function distance(
  from: Feature<Point> | Point | number[],
  to: Feature<Point> | Point | number[],
  options?: { units?: Units },
): number {
  const c1 = getCoord(from);
  const c2 = getCoord(to);
  const dLat = degreesToRadians(c2[1] - c1[1]);
  const dLon = degreesToRadians(c2[0] - c1[0]);
  const lat1 = degreesToRadians(c1[1]);
  const lat2 = degreesToRadians(c2[1]);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  const radians = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return radiansToLength(radians, options?.units ?? "kilometers");
}

export function bearing(
  start: Feature<Point> | Point | number[],
  end: Feature<Point> | Point | number[],
  options?: { final?: boolean },
): number {
  if (options?.final) {
    return calculateFinalBearing(start, end);
  }
  const c1 = getCoord(start);
  const c2 = getCoord(end);
  const lon1 = degreesToRadians(c1[0]);
  const lon2 = degreesToRadians(c2[0]);
  const lat1 = degreesToRadians(c1[1]);
  const lat2 = degreesToRadians(c2[1]);

  const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);

  return radiansToDegrees(Math.atan2(y, x));
}

function calculateFinalBearing(
  start: Feature<Point> | Point | number[],
  end: Feature<Point> | Point | number[],
): number {
  const bear = bearing(end, start);
  return (bear + 180) % 360;
}

export function rhumbBearing(
  start: Feature<Point> | Point | number[],
  end: Feature<Point> | Point | number[],
  options?: { final?: boolean },
): number {
  let bear360: number;
  if (options?.final) {
    bear360 = calculateRhumbBearing(getCoord(end), getCoord(start));
  } else {
    bear360 = calculateRhumbBearing(getCoord(start), getCoord(end));
  }
  const bear180 = bear360 > 180 ? -(360 - bear360) : bear360;
  return bear180;
}

function calculateRhumbBearing(from: number[], to: number[]): number {
  const phi1 = degreesToRadians(from[1]);
  const phi2 = degreesToRadians(to[1]);
  let dLambda = degreesToRadians(to[0] - from[0]);
  if (Math.abs(dLambda) > Math.PI) {
    dLambda = dLambda > 0 ? -(2 * Math.PI - dLambda) : 2 * Math.PI + dLambda;
  }
  const dPhi = Math.log(
    Math.tan(phi2 / 2 + Math.PI / 4) / Math.tan(phi1 / 2 + Math.PI / 4),
  );
  const theta = Math.atan2(dLambda, dPhi);
  return (radiansToDegrees(theta) + 360) % 360;
}

export function rhumbDistance(
  from: Feature<Point> | Point | number[],
  to: Feature<Point> | Point | number[],
  options?: { units?: Units },
): number {
  const c1 = getCoord(from);
  const c2 = getCoord(to);
  const destPoint =
    options?.units === "degrees"
      ? [c2[0], c2[1]]
      : [c2[0], c2[1]];

  const phi1 = degreesToRadians(c1[1]);
  const phi2 = degreesToRadians(c2[1]);
  let dPhi = phi2 - phi1;
  let dLambda = degreesToRadians(Math.abs(c2[0] - c1[0]));
  if (dLambda > Math.PI) dLambda -= 2 * Math.PI;

  const dPsi = Math.log(
    Math.tan(phi2 / 2 + Math.PI / 4) / Math.tan(phi1 / 2 + Math.PI / 4),
  );
  const q = Math.abs(dPsi) > 10e-12 ? dPhi / dPsi : Math.cos(phi1);
  dLambda = Math.abs(dLambda);
  const dist = Math.sqrt(dPhi * dPhi + q * q * dLambda * dLambda);

  return radiansToLength(dist, options?.units ?? "kilometers");
}

export function length(
  geojson: Feature<LineString> | LineString | AnyGeoJSON,
  options?: { units?: Units },
): number {
  return segmentReduce(
    geojson,
    (total, segment) => {
      const coords = segment.geometry.coordinates;
      return total + distance(coords[0] as number[], coords[1] as number[], options);
    },
    0,
  );
}

export function area(geojson: AnyGeoJSON): number {
  return geomReduce(geojson, (total, geom) => {
    return total + calculateArea(geom);
  }, 0);
}

function calculateArea(geom: Geometry | GeometryCollection): number {
  if (geom.type === "Polygon") {
    return polygonArea((geom as Polygon).coordinates as Coordinate[][]);
  }
  if (geom.type === "MultiPolygon") {
    let total = 0;
    for (const poly of (geom as unknown as { coordinates: Coordinate[][][] }).coordinates) {
      total += polygonArea(poly);
    }
    return total;
  }
  return 0;
}

function polygonArea(coords: Coordinate[][]): number {
  let total = 0;
  if (coords.length > 0) {
    total += Math.abs(ringArea(coords[0]));
    for (let i = 1; i < coords.length; i++) {
      total -= Math.abs(ringArea(coords[i]));
    }
  }
  return total;
}

function ringArea(coords: Coordinate[]): number {
  const RAD = Math.PI / 180;
  const len = coords.length;
  if (len <= 2) return 0;
  let total = 0;
  for (let i = 0; i < len; i++) {
    const lower = coords[i];
    const middle = coords[(i + 1) % len];
    const upper = coords[(i + 2) % len];
    const lowerX = lower[0] * RAD;
    const middleY = middle[1] * RAD;
    const upperX = upper[0] * RAD;
    total += (upperX - lowerX) * Math.sin(middleY);
  }
  return (total * 6371008.8 * 6371008.8) / 2;
}

export function angle(
  startPoint: Feature<Point> | Point | number[],
  midPoint: Feature<Point> | Point | number[],
  endPoint: Feature<Point> | Point | number[],
  options?: { explementary?: boolean; mercator?: boolean },
): number {
  const s = getCoord(startPoint);
  const m = getCoord(midPoint);
  const e = getCoord(endPoint);

  let azimuthStart: number;
  let azimuthEnd: number;

  if (options?.mercator) {
    azimuthStart = Math.atan2(s[0] - m[0], s[1] - m[1]);
    azimuthEnd = Math.atan2(e[0] - m[0], e[1] - m[1]);
  } else {
    azimuthStart = degreesToRadians(bearing(m, s));
    azimuthEnd = degreesToRadians(bearing(m, e));
  }

  let angleDeg = radiansToDegrees(azimuthStart - azimuthEnd);
  angleDeg = ((angleDeg % 360) + 360) % 360;

  if (options?.explementary) {
    angleDeg = 360 - angleDeg;
  }

  return angleDeg;
}

export function midpoint(
  point1: Feature<Point> | Point | number[],
  point2: Feature<Point> | Point | number[],
): Feature<Point> {
  const c1 = getCoord(point1);
  const c2 = getCoord(point2);
  const dist = distance(c1, c2);
  const bear = bearing(c1, c2);
  return destination(c1, dist / 2, bear);
}

export function centroid(geojson: AnyGeoJSON, options?: { properties?: Record<string, unknown> }): Feature<Point> {
  let xSum = 0;
  let ySum = 0;
  let len = 0;
  coordEach(geojson, (coord) => {
    xSum += coord[0];
    ySum += coord[1];
    len++;
  });
  return point([xSum / len, ySum / len], options?.properties);
}

export function center(geojson: AnyGeoJSON, options?: { properties?: Record<string, unknown>; id?: string | number }): Feature<Point> {
  const ext = bboxCalc(geojson);
  const x = (ext[0] + ext[2]) / 2;
  const y = (ext[1] + ext[3]) / 2;
  return point([x, y], options?.properties, options?.id !== undefined ? { id: options.id } : undefined);
}

export function centerMean(
  geojson: AnyGeoJSON,
  options?: { properties?: Record<string, unknown>; weight?: string },
): Feature<Point> {
  let xSum = 0;
  let ySum = 0;
  let weightSum = 0;

  if (options?.weight) {
    featureEach(geojson, (feat) => {
      const w =
        feat.properties && typeof feat.properties === "object"
          ? (feat.properties as Record<string, unknown>)[options.weight!]
          : undefined;
      const weight = typeof w === "number" ? w : 1;
      coordEach(feat, (coord) => {
        xSum += coord[0] * weight;
        ySum += coord[1] * weight;
        weightSum += weight;
      });
    });
  } else {
    coordEach(geojson, (coord) => {
      xSum += coord[0];
      ySum += coord[1];
      weightSum++;
    });
  }

  return point([xSum / weightSum, ySum / weightSum], options?.properties);
}

export function centerOfMass(geojson: AnyGeoJSON, options?: { properties?: Record<string, unknown> }): Feature<Point> {
  const type = getType(geojson);
  if (type === "Point" || type === "MultiPoint" || type === "LineString" || type === "MultiLineString") {
    return centroid(geojson, options);
  }

  // For polygons, use centroid of first polygon found
  let poly: Coordinate[][] | undefined;

  if (type === "Polygon") {
    const geom = getGeometry(geojson) as Polygon;
    poly = geom.coordinates as Coordinate[][];
  } else if (type === "MultiPolygon") {
    const geom = getGeometry(geojson) as unknown as { coordinates: Coordinate[][][] };
    // Use largest polygon
    let maxArea = 0;
    for (const ring of geom.coordinates) {
      const a = Math.abs(ringArea(ring[0]));
      if (a > maxArea) {
        maxArea = a;
        poly = ring;
      }
    }
  }

  if (!poly || poly.length === 0) {
    return centroid(geojson, options);
  }

  // Calculate centroid of polygon using the formula for centroid of a simple polygon
  const ring = poly[0];
  const n = ring.length - 1;
  let xC = 0;
  let yC = 0;
  let areaSum = 0;

  for (let i = 0; i < n; i++) {
    const cross = ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
    xC += (ring[i][0] + ring[i + 1][0]) * cross;
    yC += (ring[i][1] + ring[i + 1][1]) * cross;
    areaSum += cross;
  }

  if (areaSum === 0) return centroid(geojson, options);

  areaSum /= 2;
  xC /= 6 * areaSum;
  yC /= 6 * areaSum;

  return point([xC, yC], options?.properties);
}

// Internal helper: destination (also exported from geometry.ts, but needed here for midpoint)
function destination(
  origin: Feature<Point> | Point | number[],
  dist: number,
  bear: number,
  options?: { units?: Units },
): Feature<Point> {
  const c = getCoord(origin);
  const lng = degreesToRadians(c[0]);
  const lat = degreesToRadians(c[1]);
  const bearRad = degreesToRadians(bear);
  const radians = lengthToRadians(dist, options?.units ?? "kilometers");

  const lat2 = Math.asin(
    Math.sin(lat) * Math.cos(radians) +
    Math.cos(lat) * Math.sin(radians) * Math.cos(bearRad),
  );
  const lng2 =
    lng +
    Math.atan2(
      Math.sin(bearRad) * Math.sin(radians) * Math.cos(lat),
      Math.cos(radians) - Math.sin(lat) * Math.sin(lat2),
    );

  return point([radiansToDegrees(lng2), radiansToDegrees(lat2)]);
}

// Internal helpers
function bboxCalc(geojson: AnyGeoJSON): [number, number, number, number] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  coordEach(geojson, (coord) => {
    if (coord[0] < minX) minX = coord[0];
    if (coord[1] < minY) minY = coord[1];
    if (coord[0] > maxX) maxX = coord[0];
    if (coord[1] > maxY) maxY = coord[1];
  });
  return [minX, minY, maxX, maxY];
}

function coordEach(
  geojson: AnyGeoJSON,
  callback: (coord: Coordinate, index: number) => void,
): void {
  let index = 0;
  function processCoords(coords: Coordinate | Coordinate[] | Coordinate[][] | Coordinate[][][]): void {
    if (typeof coords[0] === "number") {
      callback(coords as Coordinate, index++);
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
}

function featureEach(
  geojson: AnyGeoJSON,
  callback: (feat: Feature, index: number) => void,
): void {
  if (geojson.type === "FeatureCollection") {
    const fc = geojson as FeatureCollection;
    for (let i = 0; i < fc.features.length; i++) {
      callback(fc.features[i], i);
    }
  } else if (geojson.type === "Feature") {
    callback(geojson as Feature, 0);
  }
}

function segmentReduce<T>(
  geojson: AnyGeoJSON,
  callback: (previous: T, segment: Feature<LineString>) => T,
  initialValue: T,
): T {
  let result = initialValue;

  function processLine(coords: Coordinate[]): void {
    for (let i = 0; i < coords.length - 1; i++) {
      const seg: Feature<LineString> = {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: [coords[i], coords[i + 1]] },
      };
      result = callback(result, seg);
    }
  }

  function processGeom(geom: Geometry | GeometryCollection): void {
    switch (geom.type) {
      case "LineString":
        processLine(geom.coordinates as Coordinate[]);
        break;
      case "MultiLineString":
      case "Polygon":
        for (const ring of geom.coordinates as Coordinate[][]) processLine(ring);
        break;
      case "MultiPolygon":
        for (const poly of geom.coordinates as Coordinate[][][]) {
          for (const ring of poly) processLine(ring);
        }
        break;
      case "GeometryCollection":
        for (const g of (geom as GeometryCollection).geometries) processGeom(g);
        break;
    }
  }

  if (geojson.type === "FeatureCollection") {
    for (const f of (geojson as FeatureCollection).features) processGeom(f.geometry);
  } else if (geojson.type === "Feature") {
    processGeom((geojson as Feature).geometry);
  } else {
    processGeom(geojson as Geometry | GeometryCollection);
  }

  return result;
}

function geomReduce<T>(
  geojson: AnyGeoJSON,
  callback: (previous: T, geom: Geometry | GeometryCollection) => T,
  initialValue: T,
): T {
  let result = initialValue;

  function processGeom(geom: Geometry | GeometryCollection): void {
    if (geom.type === "GeometryCollection") {
      for (const g of (geom as GeometryCollection).geometries) processGeom(g);
    } else {
      result = callback(result, geom);
    }
  }

  if (geojson.type === "FeatureCollection") {
    for (const f of (geojson as FeatureCollection).features) processGeom(f.geometry);
  } else if (geojson.type === "Feature") {
    processGeom((geojson as Feature).geometry);
  } else {
    processGeom(geojson as Geometry | GeometryCollection);
  }

  return result;
}

function getType(geojson: AnyGeoJSON): string {
  if (geojson.type === "Feature") return (geojson as Feature).geometry.type;
  if (geojson.type === "FeatureCollection") return "FeatureCollection";
  return geojson.type;
}

function getGeometry(geojson: AnyGeoJSON): Geometry | GeometryCollection {
  if (geojson.type === "Feature") return (geojson as Feature).geometry;
  return geojson as Geometry | GeometryCollection;
}
