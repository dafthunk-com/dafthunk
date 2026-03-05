import { bbox } from "./accessors";
import {
  degreesToRadians,
  lengthToRadians,
  radiansToDegrees,
} from "./constants";
import {
  featureCollection,
  getCoord,
  lineString,
  point,
  polygon,
} from "./helpers";
import { bearing, distance } from "./measurement";
import type {
  BBox,
  Coordinate,
  Feature,
  FeatureCollection,
  LineString,
  Point,
  Polygon,
  Units,
} from "./types";

export function bboxPolygon(
  bb: BBox,
  options?: { properties?: Record<string, unknown>; id?: string | number }
): Feature<Polygon> {
  const [west, south, east, north] = bb;
  const ring: Coordinate[] = [
    [west, south],
    [east, south],
    [east, north],
    [west, north],
    [west, south],
  ];
  return polygon(
    [ring],
    options?.properties,
    options?.id !== undefined ? { id: options.id } : undefined
  );
}

export function envelope(
  geojson: Feature | FeatureCollection
): Feature<Polygon> {
  return bboxPolygon(bbox(geojson));
}

export function square(bb: BBox): BBox {
  const [west, south, east, north] = bb;
  const dx = east - west;
  const dy = north - south;
  const diff = Math.abs(dx - dy);

  if (dx > dy) {
    const halfDiff = diff / 2;
    return [west, south - halfDiff, east, north + halfDiff];
  }
  if (dy > dx) {
    const halfDiff = diff / 2;
    return [west - halfDiff, south, east + halfDiff, north];
  }
  return bb;
}

export function circle(
  center: Feature<Point> | Point | number[],
  radius: number,
  options?: {
    steps?: number;
    units?: Units;
    properties?: Record<string, unknown>;
  }
): Feature<Polygon> {
  const steps = options?.steps ?? 64;
  const coords: Coordinate[] = [];
  for (let i = 0; i < steps; i++) {
    const angle = (i * -360) / steps;
    const dest = destination(center, radius, angle, { units: options?.units });
    coords.push(dest.geometry.coordinates);
  }
  coords.push(coords[0]); // Close ring
  return polygon([coords], options?.properties);
}

export function sector(
  center: Feature<Point> | Point | number[],
  radius: number,
  bearing1: number,
  bearing2: number,
  options?: {
    steps?: number;
    units?: Units;
    properties?: Record<string, unknown>;
  }
): Feature<Polygon> {
  const steps = options?.steps ?? 64;
  const centerCoord = getCoord(center);
  const arc = lineArc(center, radius, bearing1, bearing2, {
    steps,
    units: options?.units,
  });
  const arcCoords = arc.geometry.coordinates as Coordinate[];

  const coords: Coordinate[] = [
    centerCoord as Coordinate,
    ...arcCoords,
    centerCoord as Coordinate,
  ];
  return polygon([coords], options?.properties);
}

export function lineArc(
  center: Feature<Point> | Point | number[],
  radius: number,
  bearing1: number,
  bearing2: number,
  options?: { steps?: number; units?: Units }
): Feature<LineString> {
  const steps = options?.steps ?? 64;
  const b1 = ((bearing1 % 360) + 360) % 360;
  let b2 = ((bearing2 % 360) + 360) % 360;

  if (b1 === b2) {
    // Full circle
    const coords: Coordinate[] = [];
    for (let i = 0; i <= steps; i++) {
      const angle = b1 + (360 * i) / steps;
      const dest = destination(center, radius, angle, {
        units: options?.units,
      });
      coords.push(dest.geometry.coordinates);
    }
    return lineString(coords);
  }

  if (b2 < b1) b2 += 360;
  const angleDiff = b2 - b1;
  const coords: Coordinate[] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = b1 + (angleDiff * i) / steps;
    const dest = destination(center, radius, angle, { units: options?.units });
    coords.push(dest.geometry.coordinates);
  }
  return lineString(coords);
}

export function destination(
  origin: Feature<Point> | Point | number[],
  dist: number,
  bear: number,
  options?: { units?: Units; properties?: Record<string, unknown> }
): Feature<Point> {
  const c = getCoord(origin);
  const lng = degreesToRadians(c[0]);
  const lat = degreesToRadians(c[1]);
  const bearRad = degreesToRadians(bear);
  const radians = lengthToRadians(dist, options?.units ?? "kilometers");

  const lat2 = Math.asin(
    Math.sin(lat) * Math.cos(radians) +
      Math.cos(lat) * Math.sin(radians) * Math.cos(bearRad)
  );
  const lng2 =
    lng +
    Math.atan2(
      Math.sin(bearRad) * Math.sin(radians) * Math.cos(lat),
      Math.cos(radians) - Math.sin(lat) * Math.sin(lat2)
    );

  return point(
    [radiansToDegrees(lng2), radiansToDegrees(lat2)],
    options?.properties
  );
}

export function rhumbDestination(
  origin: Feature<Point> | Point | number[],
  dist: number,
  bear: number,
  options?: { units?: Units; properties?: Record<string, unknown> }
): Feature<Point> {
  const c = getCoord(origin);
  const delta = lengthToRadians(dist, options?.units ?? "kilometers");
  const lambda1 = degreesToRadians(c[0]);
  const phi1 = degreesToRadians(c[1]);
  const theta = degreesToRadians(bear);

  const dPhi = delta * Math.cos(theta);
  let phi2 = phi1 + dPhi;

  if (Math.abs(phi2) > Math.PI / 2) {
    phi2 = phi2 > 0 ? Math.PI - phi2 : -Math.PI - phi2;
  }

  const dPsi = Math.log(
    Math.tan(phi2 / 2 + Math.PI / 4) / Math.tan(phi1 / 2 + Math.PI / 4)
  );
  const q = Math.abs(dPsi) > 10e-12 ? dPhi / dPsi : Math.cos(phi1);
  const dLambda = (delta * Math.sin(theta)) / q;
  const lambda2 = lambda1 + dLambda;

  return point(
    [radiansToDegrees(lambda2), radiansToDegrees(phi2)],
    options?.properties
  );
}

export function along(
  line: Feature<LineString> | LineString,
  dist: number,
  options?: { units?: Units }
): Feature<Point> {
  const coords =
    line.type === "Feature"
      ? (line as Feature<LineString>).geometry.coordinates
      : (line as LineString).coordinates;

  let travelled = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const segDist = distance(
      coords[i] as number[],
      coords[i + 1] as number[],
      options
    );
    if (travelled + segDist >= dist) {
      const overshoot = dist - travelled;
      if (overshoot === 0) return point(coords[i] as number[]);
      const direction = bearing(
        coords[i] as number[],
        coords[i + 1] as number[]
      );
      return destination(coords[i] as number[], overshoot, direction, options);
    }
    travelled += segDist;
  }

  return point(coords[coords.length - 1] as number[]);
}

export function greatCircle(
  start: Feature<Point> | Point | number[],
  end: Feature<Point> | Point | number[],
  options?: {
    properties?: Record<string, unknown>;
    npoints?: number;
    offset?: number;
  }
): Feature<LineString> {
  const npoints = options?.npoints ?? 100;
  const c1 = getCoord(start);
  const c2 = getCoord(end);
  const interpolate = createGreatCircleInterpolator(c1, c2);

  const coords: Coordinate[] = [];
  for (let i = 0; i < npoints; i++) {
    const f = i / (npoints - 1);
    coords.push(interpolate(f));
  }

  return lineString(coords, options?.properties);
}

function createGreatCircleInterpolator(
  from: number[],
  to: number[]
): (f: number) => Coordinate {
  const lat1 = degreesToRadians(from[1]);
  const lon1 = degreesToRadians(from[0]);
  const lat2 = degreesToRadians(to[1]);
  const lon2 = degreesToRadians(to[0]);
  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((lat1 - lat2) / 2) ** 2 +
          Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon1 - lon2) / 2) ** 2
      )
    );

  return (f: number): Coordinate => {
    if (Math.abs(d) < 1e-10) return from as Coordinate;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x =
      A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
    const y =
      A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    return [
      radiansToDegrees(Math.atan2(y, x)),
      radiansToDegrees(Math.atan2(z, Math.sqrt(x * x + y * y))),
    ];
  };
}

export function buffer(
  geojson: Feature | FeatureCollection,
  radius: number,
  options?: { units?: Units; steps?: number }
): Feature<Polygon> | FeatureCollection<Polygon> | undefined {
  const units = options?.units ?? "kilometers";
  const steps = options?.steps ?? 8;

  if (geojson.type === "FeatureCollection") {
    const results: Feature<Polygon>[] = [];
    for (const feat of (geojson as FeatureCollection).features) {
      const buffered = bufferFeature(feat, radius, units, steps);
      if (buffered) results.push(buffered);
    }
    return featureCollection(results) as FeatureCollection<Polygon>;
  }

  return bufferFeature(geojson as Feature, radius, units, steps);
}

function bufferFeature(
  feat: Feature,
  radius: number,
  units: Units,
  steps: number
): Feature<Polygon> | undefined {
  const geom = feat.geometry;

  if (geom.type === "Point") {
    return circle(geom as Point, Math.abs(radius), {
      units,
      steps,
      properties: feat.properties ?? {},
    });
  }

  if (geom.type === "LineString") {
    return bufferLineString(
      (geom as LineString).coordinates as Coordinate[],
      radius,
      units,
      steps,
      feat.properties
    );
  }

  if (geom.type === "Polygon") {
    return bufferPolygon(
      (geom as Polygon).coordinates as Coordinate[][],
      radius,
      units,
      steps,
      feat.properties
    );
  }

  // For other types, try converting to simpler types
  return undefined;
}

function bufferLineString(
  coords: Coordinate[],
  radius: number,
  units: Units,
  steps: number,
  properties: Record<string, unknown> | null
): Feature<Polygon> {
  // Generate offset on both sides and connect
  const left = offsetCoords(coords, radius, units, steps, "left");
  const right = offsetCoords(coords, radius, units, steps, "right");

  // Create start cap
  const startCap = createCap(
    coords[0],
    coords[1],
    radius,
    units,
    steps,
    "start"
  );
  // Create end cap
  const endCap = createCap(
    coords[coords.length - 2],
    coords[coords.length - 1],
    radius,
    units,
    steps,
    "end"
  );

  const ring: Coordinate[] = [
    ...left,
    ...endCap,
    ...right.reverse(),
    ...startCap,
  ];
  ring.push(ring[0]); // Close

  return polygon([ring], properties ?? {});
}

function bufferPolygon(
  coords: Coordinate[][],
  radius: number,
  units: Units,
  steps: number,
  properties: Record<string, unknown> | null
): Feature<Polygon> {
  if (radius > 0) {
    // Expand polygon outward
    const outerRing = coords[0];
    const buffered = bufferRing(outerRing, radius, units, steps);
    return polygon([buffered], properties ?? {});
  }
  // Shrink polygon inward
  const outerRing = coords[0];
  const buffered = bufferRing(outerRing, radius, units, steps);
  if (buffered.length < 4) {
    return polygon([outerRing], properties ?? {});
  }
  return polygon([buffered], properties ?? {});
}

function bufferRing(
  ring: Coordinate[],
  radius: number,
  units: Units,
  steps: number
): Coordinate[] {
  const result: Coordinate[] = [];
  const n = ring.length - 1; // Exclude closing point

  for (let i = 0; i < n; i++) {
    const prev = ring[(i - 1 + n) % n];
    const curr = ring[i];
    const next = ring[(i + 1) % n];

    // Calculate the bearing of the two edges
    const bear1 = bearing(curr, prev);
    const bear2 = bearing(curr, next);

    // Offset perpendicular to the bisector
    const bisector = (bear1 + bear2) / 2;
    const offsetBearing = bisector + 90;

    const dest = destinationCalc(
      curr,
      Math.abs(radius),
      radius > 0 ? offsetBearing : offsetBearing + 180,
      units
    );
    result.push(dest);

    // Add arc points for rounded corners
    const angleDiff = (bear2 - bear1 + 360) % 360;
    if (angleDiff > 180 || angleDiff === 0) {
      // Convex corner - add arc
      for (let s = 1; s < steps; s++) {
        const frac = s / steps;
        const arcBear = bear1 - 90 + frac * (360 - angleDiff);
        const arcDest = destinationCalc(curr, Math.abs(radius), arcBear, units);
        result.push(arcDest);
      }
    }
  }

  result.push(result[0]); // Close ring
  return result;
}

function offsetCoords(
  coords: Coordinate[],
  radius: number,
  units: Units,
  _steps: number,
  side: "left" | "right"
): Coordinate[] {
  const result: Coordinate[] = [];
  for (let i = 0; i < coords.length; i++) {
    const bear =
      i < coords.length - 1
        ? bearing(coords[i], coords[i + 1])
        : bearing(coords[i - 1], coords[i]);

    const offsetBear = side === "left" ? bear - 90 : bear + 90;
    result.push(
      destinationCalc(coords[i], Math.abs(radius), offsetBear, units)
    );
  }
  return result;
}

function createCap(
  from: Coordinate,
  to: Coordinate,
  radius: number,
  units: Units,
  steps: number,
  end: "start" | "end"
): Coordinate[] {
  const bear = bearing(from, to);
  const center = end === "start" ? from : to;
  const startBear = end === "start" ? bear + 90 : bear - 90;

  const result: Coordinate[] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = startBear + (180 * i) / steps;
    result.push(destinationCalc(center, Math.abs(radius), angle, units));
  }
  return result;
}

function destinationCalc(
  origin: Coordinate | number[],
  dist: number,
  bear: number,
  units: Units
): Coordinate {
  const lng = degreesToRadians(origin[0]);
  const lat = degreesToRadians(origin[1]);
  const bearRad = degreesToRadians(bear);
  const radians = lengthToRadians(dist, units);

  const lat2 = Math.asin(
    Math.sin(lat) * Math.cos(radians) +
      Math.cos(lat) * Math.sin(radians) * Math.cos(bearRad)
  );
  const lng2 =
    lng +
    Math.atan2(
      Math.sin(bearRad) * Math.sin(radians) * Math.cos(lat),
      Math.cos(radians) - Math.sin(lat) * Math.sin(lat2)
    );

  return [radiansToDegrees(lng2), radiansToDegrees(lat2)];
}
