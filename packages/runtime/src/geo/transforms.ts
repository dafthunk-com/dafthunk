import type {
  Coordinate,
  Feature,
  FeatureCollection,
  Geometry,
  GeometryCollection,
  Point,
  Units,
} from "./types";
import { degreesToRadians, lengthToRadians, radiansToDegrees } from "./constants";
import { getCoord, point } from "./helpers";
import { bearing, centroid, distance, rhumbBearing, rhumbDistance } from "./measurement";

type AnyGeoJSON = Geometry | GeometryCollection | Feature | FeatureCollection;

export function transformScale(
  geojson: AnyGeoJSON,
  factor: number,
  options?: { origin?: string | number[] | Feature; mutate?: boolean },
): AnyGeoJSON {
  if (factor === 1) return geojson;

  const origin = getScaleOrigin(geojson, options?.origin);
  const originCoord = getCoord(origin as Feature<Point> | number[]);

  const result = options?.mutate ? geojson : JSON.parse(JSON.stringify(geojson));
  coordEach(result, (coord) => {
    const dist = distance(originCoord, coord);
    const bear = bearing(originCoord, coord);
    const newPoint = destinationRaw(originCoord, dist * factor, bear);
    coord[0] = newPoint[0];
    coord[1] = newPoint[1];
  });

  return result;
}

export function transformRotate(
  geojson: AnyGeoJSON,
  angleDeg: number,
  options?: { pivot?: number[] | Feature; mutate?: boolean },
): AnyGeoJSON {
  if (angleDeg === 0) return geojson;

  const pivot = options?.pivot ? getCoord(options.pivot as Feature<Point> | number[]) : getCoord(centroid(geojson));
  const result = options?.mutate ? geojson : JSON.parse(JSON.stringify(geojson));

  coordEach(result, (coord) => {
    const dist = rhumbDistance(pivot, coord);
    const bear = rhumbBearing(pivot, coord);
    const newBearing = bear + angleDeg;
    const newPoint = rhumbDestinationRaw(pivot, dist, newBearing);
    coord[0] = newPoint[0];
    coord[1] = newPoint[1];
  });

  return result;
}

export function transformTranslate(
  geojson: AnyGeoJSON,
  dist: number,
  direction: number,
  options?: { units?: Units; zTranslation?: number; mutate?: boolean },
): AnyGeoJSON {
  if (dist === 0 && (!options?.zTranslation || options.zTranslation === 0)) return geojson;

  const result = options?.mutate ? geojson : JSON.parse(JSON.stringify(geojson));

  coordEach(result, (coord) => {
    const newPoint = destinationRaw(coord, dist, direction, options?.units);
    coord[0] = newPoint[0];
    coord[1] = newPoint[1];
    if (options?.zTranslation && coord.length >= 3) {
      coord[2] = (coord[2] || 0) + options.zTranslation;
    }
  });

  return result;
}

export function rewind(
  geojson: AnyGeoJSON,
  options?: { reverse?: boolean; mutate?: boolean },
): AnyGeoJSON {
  const result = options?.mutate ? geojson : JSON.parse(JSON.stringify(geojson));
  const reverse = options?.reverse ?? false;

  function rewindRings(coords: Coordinate[][], isMulti: boolean): void {
    if (isMulti) {
      for (const poly of coords as unknown as Coordinate[][][]) {
        rewindRings(poly, false);
      }
      return;
    }
    // Outer ring should be counter-clockwise (for RFC 7946)
    // If reverse is true, outer ring should be clockwise
    if (coords.length > 0) {
      if (isClockwise(coords[0]) !== reverse) {
        coords[0].reverse();
      }
      for (let i = 1; i < coords.length; i++) {
        if (isClockwise(coords[i]) === reverse) {
          coords[i].reverse();
        }
      }
    }
  }

  function processGeom(geom: Geometry | GeometryCollection): void {
    if (geom.type === "GeometryCollection") {
      for (const g of (geom as GeometryCollection).geometries) processGeom(g);
      return;
    }
    if (geom.type === "Polygon") {
      rewindRings(geom.coordinates as Coordinate[][], false);
    } else if (geom.type === "MultiPolygon") {
      rewindRings(geom.coordinates as unknown as Coordinate[][], true);
    }
  }

  if (result.type === "FeatureCollection") {
    for (const f of (result as FeatureCollection).features) processGeom(f.geometry);
  } else if (result.type === "Feature") {
    processGeom((result as Feature).geometry);
  } else {
    processGeom(result as Geometry | GeometryCollection);
  }

  return result;
}

export function truncate(
  geojson: AnyGeoJSON,
  options?: { precision?: number; coordinates?: number; mutate?: boolean },
): AnyGeoJSON {
  const precision = options?.precision ?? 6;
  const coordinates = options?.coordinates ?? 3;
  const result = options?.mutate ? geojson : JSON.parse(JSON.stringify(geojson));

  const factor = 10 ** precision;

  coordEach(result, (coord) => {
    // Truncate to precision
    for (let i = 0; i < coord.length && i < coordinates; i++) {
      coord[i] = Math.round(coord[i] * factor) / factor;
    }
    // Remove extra coordinates
    (coord as number[]).length = Math.min(coord.length, coordinates);
  });

  return result;
}

export function cleanCoords(
  geojson: Feature | Geometry,
  options?: { mutate?: boolean },
): Feature | Geometry {
  const result = options?.mutate ? geojson : JSON.parse(JSON.stringify(geojson));

  function cleanRing(coords: Coordinate[]): Coordinate[] {
    const cleaned: Coordinate[] = [coords[0]];
    for (let i = 1; i < coords.length; i++) {
      if (coords[i][0] !== coords[i - 1][0] || coords[i][1] !== coords[i - 1][1]) {
        cleaned.push(coords[i]);
      }
    }
    return cleaned;
  }

  function processGeom(geom: Geometry): void {
    switch (geom.type) {
      case "LineString": {
        const coords = geom.coordinates as Coordinate[];
        geom.coordinates = cleanRing(coords);
        break;
      }
      case "MultiLineString":
      case "Polygon": {
        const rings = geom.coordinates as Coordinate[][];
        for (let i = 0; i < rings.length; i++) {
          rings[i] = cleanRing(rings[i]);
        }
        break;
      }
      case "MultiPolygon": {
        const polys = geom.coordinates as Coordinate[][][];
        for (const poly of polys) {
          for (let i = 0; i < poly.length; i++) {
            poly[i] = cleanRing(poly[i]);
          }
        }
        break;
      }
    }
  }

  if (result.type === "Feature") {
    processGeom((result as Feature).geometry as Geometry);
  } else {
    processGeom(result as Geometry);
  }

  return result;
}

export function simplify(
  geojson: AnyGeoJSON,
  options?: { tolerance?: number; highQuality?: boolean; mutate?: boolean },
): AnyGeoJSON {
  const tolerance = options?.tolerance ?? 1;
  const highQuality = options?.highQuality ?? false;
  const result = options?.mutate ? geojson : JSON.parse(JSON.stringify(geojson));

  function simplifyRing(coords: Coordinate[], isRing: boolean): Coordinate[] {
    if (coords.length <= 2) return coords;

    const simplified = highQuality
      ? douglasPeucker(coords, tolerance)
      : simplifyRadialDist(coords, tolerance);

    if (isRing && simplified.length < 4) {
      return coords;
    }
    if (!isRing && simplified.length < 2) {
      return coords;
    }

    return simplified;
  }

  function processGeom(geom: Geometry): void {
    switch (geom.type) {
      case "LineString": {
        geom.coordinates = simplifyRing(geom.coordinates as Coordinate[], false);
        break;
      }
      case "MultiLineString": {
        const lines = geom.coordinates as Coordinate[][];
        for (let i = 0; i < lines.length; i++) {
          lines[i] = simplifyRing(lines[i], false);
        }
        break;
      }
      case "Polygon": {
        const rings = geom.coordinates as Coordinate[][];
        for (let i = 0; i < rings.length; i++) {
          rings[i] = simplifyRing(rings[i], true);
        }
        break;
      }
      case "MultiPolygon": {
        const polys = geom.coordinates as Coordinate[][][];
        for (const poly of polys) {
          for (let i = 0; i < poly.length; i++) {
            poly[i] = simplifyRing(poly[i], true);
          }
        }
        break;
      }
    }
  }

  function processGeomOrCollection(geom: Geometry | GeometryCollection): void {
    if (geom.type === "GeometryCollection") {
      for (const g of (geom as GeometryCollection).geometries) processGeomOrCollection(g);
    } else {
      processGeom(geom as Geometry);
    }
  }

  if (result.type === "FeatureCollection") {
    for (const f of (result as FeatureCollection).features) processGeomOrCollection(f.geometry);
  } else if (result.type === "Feature") {
    processGeomOrCollection((result as Feature).geometry);
  } else {
    processGeomOrCollection(result as Geometry | GeometryCollection);
  }

  return result;
}

// Douglas-Peucker simplification
function douglasPeucker(coords: Coordinate[], tolerance: number): Coordinate[] {
  const sqTolerance = tolerance * tolerance;
  const len = coords.length;
  const markers = new Uint8Array(len);
  markers[0] = 1;
  markers[len - 1] = 1;

  const stack: [number, number][] = [[0, len - 1]];

  while (stack.length > 0) {
    const [first, last] = stack.pop()!;
    let maxSqDist = 0;
    let index = first;

    for (let i = first + 1; i < last; i++) {
      const sqDist = sqSegDist(coords[i], coords[first], coords[last]);
      if (sqDist > maxSqDist) {
        index = i;
        maxSqDist = sqDist;
      }
    }

    if (maxSqDist > sqTolerance) {
      markers[index] = 1;
      if (first + 1 < index) stack.push([first, index]);
      if (index + 1 < last) stack.push([index, last]);
    }
  }

  const result: Coordinate[] = [];
  for (let i = 0; i < len; i++) {
    if (markers[i]) result.push(coords[i]);
  }
  return result;
}

function simplifyRadialDist(coords: Coordinate[], tolerance: number): Coordinate[] {
  const sqTolerance = tolerance * tolerance;
  let prevCoord = coords[0];
  const result: Coordinate[] = [prevCoord];

  for (let i = 1; i < coords.length; i++) {
    const coord = coords[i];
    const dx = coord[0] - prevCoord[0];
    const dy = coord[1] - prevCoord[1];
    if (dx * dx + dy * dy > sqTolerance) {
      result.push(coord);
      prevCoord = coord;
    }
  }

  if (prevCoord !== coords[coords.length - 1]) {
    result.push(coords[coords.length - 1]);
  }

  return result;
}

function sqSegDist(p: Coordinate, a: Coordinate, b: Coordinate): number {
  let x = a[0];
  let y = a[1];
  let dx = b[0] - x;
  let dy = b[1] - y;

  if (dx !== 0 || dy !== 0) {
    const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = b[0];
      y = b[1];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }

  dx = p[0] - x;
  dy = p[1] - y;
  return dx * dx + dy * dy;
}

// Helper: check if a ring is clockwise
function isClockwise(ring: Coordinate[]): boolean {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    sum += (ring[i + 1][0] - ring[i][0]) * (ring[i + 1][1] + ring[i][1]);
  }
  return sum > 0;
}

// Helper: get scale origin
function getScaleOrigin(
  geojson: AnyGeoJSON,
  origin?: string | number[] | Feature,
): Feature | number[] {
  if (!origin || origin === "centroid") return centroid(geojson);
  if (typeof origin === "string") {
    if (origin === "center") {
      const c = centroid(geojson);
      return c;
    }
    return centroid(geojson);
  }
  return origin;
}

// Helper: raw destination (returns coords)
function destinationRaw(
  origin: number[],
  dist: number,
  bear: number,
  units?: Units,
): number[] {
  const c = getCoord(origin);
  const lng = degreesToRadians(c[0]);
  const lat = degreesToRadians(c[1]);
  const bearRad = degreesToRadians(bear);
  const radians = lengthToRadians(dist, units ?? "kilometers");

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

  return [radiansToDegrees(lng2), radiansToDegrees(lat2)];
}

// Helper: raw rhumb destination (returns coords)
function rhumbDestinationRaw(origin: number[], dist: number, bear: number, units?: Units): number[] {
  const delta = lengthToRadians(dist, units ?? "kilometers");
  const lambda1 = degreesToRadians(origin[0]);
  const phi1 = degreesToRadians(origin[1]);
  const theta = degreesToRadians(bear);

  const dPhi = delta * Math.cos(theta);
  let phi2 = phi1 + dPhi;

  if (Math.abs(phi2) > Math.PI / 2) {
    phi2 = phi2 > 0 ? Math.PI - phi2 : -Math.PI - phi2;
  }

  const dPsi = Math.log(
    Math.tan(phi2 / 2 + Math.PI / 4) / Math.tan(phi1 / 2 + Math.PI / 4),
  );
  const q = Math.abs(dPsi) > 10e-12 ? dPhi / dPsi : Math.cos(phi1);
  const dLambda = (delta * Math.sin(theta)) / q;
  const lambda2 = lambda1 + dLambda;

  return [radiansToDegrees(lambda2), radiansToDegrees(phi2)];
}

// Internal coordEach
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
