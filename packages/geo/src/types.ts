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
} from "@dafthunk/types";

export type {
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
};

export type Units =
  | "meters"
  | "millimeters"
  | "centimeters"
  | "kilometers"
  | "acres"
  | "miles"
  | "nauticalmiles"
  | "inches"
  | "yards"
  | "feet"
  | "radians"
  | "degrees";

export type AllGeoJSON =
  | Geometry
  | GeometryCollection
  | Feature
  | FeatureCollection;

export type BBox = [number, number, number, number];
