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

export function point(
  coordinates: number[],
  properties?: Record<string, unknown>,
  options?: { id?: string | number }
): Feature<Point> {
  if (!coordinates) throw new Error("coordinates is required");
  if (!Array.isArray(coordinates))
    throw new Error("coordinates must be an Array");
  if (coordinates.length < 2)
    throw new Error("coordinates must be at least 2 numbers long");

  const feat: Feature<Point> = {
    type: "Feature",
    properties: properties ?? {},
    geometry: {
      type: "Point",
      coordinates: coordinates as Coordinate,
    },
  };
  if (options?.id !== undefined) feat.id = options.id;
  return feat;
}

export function lineString(
  coordinates: number[][],
  properties?: Record<string, unknown>,
  options?: { id?: string | number }
): Feature<LineString> {
  if (!coordinates) throw new Error("coordinates is required");
  if (coordinates.length < 2)
    throw new Error("coordinates must be an array of two or more positions");

  const feat: Feature<LineString> = {
    type: "Feature",
    properties: properties ?? {},
    geometry: {
      type: "LineString",
      coordinates: coordinates as Coordinate[],
    },
  };
  if (options?.id !== undefined) feat.id = options.id;
  return feat;
}

export function polygon(
  coordinates: number[][][],
  properties?: Record<string, unknown>,
  options?: { id?: string | number }
): Feature<Polygon> {
  if (!coordinates) throw new Error("coordinates is required");
  for (const ring of coordinates) {
    if (ring.length < 4) {
      throw new Error(
        "Each LinearRing of a Polygon must have 4 or more Positions."
      );
    }
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      throw new Error("First and last Position are not equivalent.");
    }
  }

  const feat: Feature<Polygon> = {
    type: "Feature",
    properties: properties ?? {},
    geometry: {
      type: "Polygon",
      coordinates: coordinates as Coordinate[][],
    },
  };
  if (options?.id !== undefined) feat.id = options.id;
  return feat;
}

export function multiPoint(
  coordinates: number[][],
  properties?: Record<string, unknown>,
  options?: { id?: string | number }
): Feature<MultiPoint> {
  const feat: Feature<MultiPoint> = {
    type: "Feature",
    properties: properties ?? {},
    geometry: {
      type: "MultiPoint",
      coordinates: coordinates as Coordinate[],
    },
  };
  if (options?.id !== undefined) feat.id = options.id;
  return feat;
}

export function multiLineString(
  coordinates: number[][][],
  properties?: Record<string, unknown>,
  options?: { id?: string | number }
): Feature<MultiLineString> {
  const feat: Feature<MultiLineString> = {
    type: "Feature",
    properties: properties ?? {},
    geometry: {
      type: "MultiLineString",
      coordinates: coordinates as Coordinate[][],
    },
  };
  if (options?.id !== undefined) feat.id = options.id;
  return feat;
}

export function multiPolygon(
  coordinates: number[][][][],
  properties?: Record<string, unknown>,
  options?: { id?: string | number }
): Feature<MultiPolygon> {
  const feat: Feature<MultiPolygon> = {
    type: "Feature",
    properties: properties ?? {},
    geometry: {
      type: "MultiPolygon",
      coordinates: coordinates as Coordinate[][][],
    },
  };
  if (options?.id !== undefined) feat.id = options.id;
  return feat;
}

export function feature<G extends Geometry | GeometryCollection>(
  geom: G,
  properties?: Record<string, unknown>,
  options?: { id?: string | number }
): Feature<G> {
  const feat: Feature<G> = {
    type: "Feature",
    properties: properties ?? {},
    geometry: geom,
  };
  if (options?.id !== undefined) feat.id = options.id;
  return feat;
}

export function featureCollection<G extends Geometry | GeometryCollection>(
  features: Array<Feature<G>>,
  _options?: { id?: string | number }
): FeatureCollection<G> {
  const fc: FeatureCollection<G> = {
    type: "FeatureCollection",
    features,
  };
  return fc;
}

export function geometryCollection(
  geometries: Geometry[],
  properties?: Record<string, unknown>,
  options?: { id?: string | number }
): Feature<GeometryCollection> {
  const feat: Feature<GeometryCollection> = {
    type: "Feature",
    properties: properties ?? {},
    geometry: {
      type: "GeometryCollection",
      geometries,
    },
  };
  if (options?.id !== undefined) feat.id = options.id;
  return feat;
}

export function round(num: number, precision = 0): number {
  if (precision === 0) return Math.round(num);
  const factor = 10 ** precision;
  return Math.round(num * factor) / factor;
}

export function getCoord(coord: Feature<Point> | Point | number[]): number[] {
  if (Array.isArray(coord)) return coord;
  if (coord.type === "Feature")
    return (coord as Feature<Point>).geometry.coordinates;
  if (coord.type === "Point") return (coord as Point).coordinates;
  throw new Error("coord must be GeoJSON Point or an Array of Numbers");
}

export function getCoords(
  obj: Feature<Geometry> | Geometry
): Coordinate | Coordinate[] | Coordinate[][] | Coordinate[][][] {
  if (obj.type === "Feature")
    return (obj as Feature<Geometry>).geometry.coordinates;
  return (obj as Geometry).coordinates;
}

export function getGeom(
  geojson:
    | Feature<Geometry | GeometryCollection>
    | Geometry
    | GeometryCollection
): Geometry | GeometryCollection {
  if (geojson.type === "Feature")
    return (geojson as Feature<Geometry | GeometryCollection>).geometry;
  return geojson as Geometry | GeometryCollection;
}
