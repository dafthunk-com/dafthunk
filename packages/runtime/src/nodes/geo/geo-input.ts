import type { AllGeoJSON, Units } from "@dafthunk/geo";

/**
 * Guards for the untyped values that reach geo nodes from the workflow graph.
 *
 * Node inputs arrive as `unknown` shapes decoded from stored workflow JSON, so
 * every geo node has to narrow them before handing them to `@dafthunk/geo`.
 * Keeping the guards here means a malformed unit or geometry is rejected the
 * same way everywhere instead of reaching the geo functions as a silent cast.
 */

const UNITS: readonly Units[] = [
  "meters",
  "millimeters",
  "centimeters",
  "kilometers",
  "acres",
  "miles",
  "nauticalmiles",
  "inches",
  "yards",
  "feet",
  "radians",
  "degrees",
];

/** Comma-separated unit list, for error messages. */
export const UNITS_LIST = UNITS.join(", ");

/** Narrows a value to a distance unit supported by `@dafthunk/geo`. */
export function isUnits(value: unknown): value is Units {
  return (
    typeof value === "string" && (UNITS as readonly string[]).includes(value)
  );
}

const GEOJSON_TYPES = new Set([
  "Feature",
  "FeatureCollection",
  "GeometryCollection",
  "Point",
  "MultiPoint",
  "LineString",
  "MultiLineString",
  "Polygon",
  "MultiPolygon",
]);

/** Narrows a value to any GeoJSON object `@dafthunk/geo` accepts. */
export function isGeoJSON(value: unknown): value is AllGeoJSON {
  if (!value || typeof value !== "object") return false;
  const type = (value as { type?: unknown }).type;
  return typeof type === "string" && GEOJSON_TYPES.has(type);
}

/**
 * Narrows a value to GeoJSON of one of the given `type` values, e.g.
 * `isGeoJSONOf(input, "Polygon", "MultiPolygon")`. A `Feature` matches when its
 * geometry does, so callers accept both bare geometries and wrapped features.
 */
export function isGeoJSONOf(
  value: unknown,
  ...types: string[]
): value is AllGeoJSON {
  if (!isGeoJSON(value)) return false;
  const type = (value as { type: string }).type;
  if (types.includes(type)) return true;
  if (type !== "Feature") return false;
  const geometry = (value as { geometry?: { type?: unknown } }).geometry;
  return typeof geometry?.type === "string" && types.includes(geometry.type);
}

/** Feature properties as they travel through the workflow graph. */
export type GeoProperties = Record<string, unknown>;

/** A `[longitude, latitude]` pair. */
export type GeoPosition = [number, number];

/**
 * Pulls a `[lng, lat]` pair out of a bare coordinate array, a Point geometry,
 * or a Feature wrapping one. Returns null when the value is none of those.
 */
export function extractPosition(value: unknown): GeoPosition | null {
  if (Array.isArray(value) && value.length >= 2) {
    const [lng, lat] = value;
    if (typeof lng === "number" && typeof lat === "number") return [lng, lat];
    return null;
  }
  if (!value || typeof value !== "object") return null;

  const candidate = value as {
    type?: unknown;
    coordinates?: unknown;
    geometry?: { type?: unknown; coordinates?: unknown };
  };
  if (candidate.type === "Point") return extractPosition(candidate.coordinates);
  if (candidate.type === "Feature" && candidate.geometry?.type === "Point") {
    return extractPosition(candidate.geometry.coordinates);
  }
  return null;
}
