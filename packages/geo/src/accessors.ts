import {
  feature,
  featureCollection,
  multiLineString,
  multiPoint,
  multiPolygon,
  point,
} from "./helpers";
import type {
  BBox,
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

function coordEach(
  geojson: AnyGeoJSON,
  callback: (coord: Coordinate, index: number) => void
): void {
  let index = 0;

  function processCoordinates(
    coords: Coordinate | Coordinate[] | Coordinate[][] | Coordinate[][][]
  ): void {
    if (typeof coords[0] === "number") {
      callback(coords as Coordinate, index++);
      return;
    }
    for (const c of coords as (Coordinate | Coordinate[] | Coordinate[][])[]) {
      processCoordinates(c as Coordinate);
    }
  }

  function processGeometry(geom: Geometry | GeometryCollection): void {
    if ("geometries" in geom) {
      for (const g of geom.geometries) {
        processGeometry(g);
      }
    } else {
      processCoordinates(geom.coordinates);
    }
  }

  if (geojson.type === "FeatureCollection") {
    for (const feat of (geojson as FeatureCollection).features) {
      processGeometry(feat.geometry);
    }
  } else if (geojson.type === "Feature") {
    processGeometry((geojson as Feature).geometry);
  } else {
    processGeometry(geojson as Geometry | GeometryCollection);
  }
}

export function bbox(geojson: AnyGeoJSON): BBox {
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

export function explode(geojson: AnyGeoJSON): FeatureCollection<Point> {
  const points: Feature<Point>[] = [];
  coordEach(geojson, (coord) => {
    points.push(point(coord));
  });
  return featureCollection(points);
}

export function combine(fc: FeatureCollection): FeatureCollection {
  const points: Coordinate[] = [];
  const lines: Coordinate[][] = [];
  const polys: Coordinate[][][] = [];

  for (const feat of fc.features) {
    const geom = feat.geometry as Geometry;
    switch (geom.type) {
      case "Point":
        points.push(geom.coordinates as Coordinate);
        break;
      case "MultiPoint":
        for (const c of geom.coordinates as Coordinate[]) points.push(c);
        break;
      case "LineString":
        lines.push(geom.coordinates as Coordinate[]);
        break;
      case "MultiLineString":
        for (const c of geom.coordinates as Coordinate[][]) lines.push(c);
        break;
      case "Polygon":
        polys.push(geom.coordinates as Coordinate[][]);
        break;
      case "MultiPolygon":
        for (const c of geom.coordinates as Coordinate[][][]) polys.push(c);
        break;
    }
  }

  const result: Feature[] = [];
  if (points.length > 0) result.push(multiPoint(points));
  if (lines.length > 0) result.push(multiLineString(lines));
  if (polys.length > 0) result.push(multiPolygon(polys));

  return featureCollection(result);
}

export function flatten(geojson: AnyGeoJSON): FeatureCollection {
  const result: Feature[] = [];

  function processFeature(feat: Feature): void {
    const geom = feat.geometry;
    if (geom.type === "GeometryCollection") {
      for (const g of (geom as unknown as GeometryCollection).geometries) {
        processFeature({
          type: "Feature",
          geometry: g,
          properties: feat.properties,
        });
      }
      return;
    }

    switch (geom.type) {
      case "MultiPoint":
        for (const coord of (geom as MultiPoint).coordinates) {
          result.push(
            feature({ type: "Point", coordinates: coord } as Point, {
              ...feat.properties,
            })
          );
        }
        break;
      case "MultiLineString":
        for (const coord of (geom as MultiLineString).coordinates) {
          result.push(
            feature({ type: "LineString", coordinates: coord } as LineString, {
              ...feat.properties,
            })
          );
        }
        break;
      case "MultiPolygon":
        for (const coord of (geom as MultiPolygon).coordinates) {
          result.push(
            feature({ type: "Polygon", coordinates: coord } as Polygon, {
              ...feat.properties,
            })
          );
        }
        break;
      default:
        result.push(feat);
    }
  }

  if (geojson.type === "FeatureCollection") {
    for (const feat of (geojson as FeatureCollection).features) {
      processFeature(feat);
    }
  } else if (geojson.type === "Feature") {
    processFeature(geojson as Feature);
  } else {
    processFeature(feature(geojson as Geometry));
  }

  return featureCollection(result);
}

export function flip(geojson: AnyGeoJSON): AnyGeoJSON {
  function flipCoord(coord: Coordinate): Coordinate {
    return coord.length === 3
      ? [coord[1], coord[0], coord[2]]
      : [coord[1], coord[0]];
  }

  function flipCoords(
    coords: Coordinate | Coordinate[] | Coordinate[][] | Coordinate[][][],
    depth: number
  ): Coordinate | Coordinate[] | Coordinate[][] | Coordinate[][][] {
    if (depth === 0) return flipCoord(coords as Coordinate);
    return (coords as Coordinate[][]).map((c) => flipCoords(c, depth - 1)) as
      | Coordinate[]
      | Coordinate[][]
      | Coordinate[][][];
  }

  function coordDepth(type: string): number {
    switch (type) {
      case "Point":
        return 0;
      case "MultiPoint":
      case "LineString":
        return 1;
      case "MultiLineString":
      case "Polygon":
        return 2;
      case "MultiPolygon":
        return 3;
      default:
        return 0;
    }
  }

  function flipGeometry(
    geom: Geometry | GeometryCollection
  ): Geometry | GeometryCollection {
    if ("geometries" in geom) {
      return {
        type: "GeometryCollection",
        geometries: geom.geometries.map(flipGeometry) as Geometry[],
      };
    }
    return {
      ...geom,
      coordinates: flipCoords(
        (geom as Geometry).coordinates,
        coordDepth(geom.type)
      ),
    } as Geometry;
  }

  if (geojson.type === "FeatureCollection") {
    const fc = geojson as FeatureCollection;
    return {
      type: "FeatureCollection",
      features: fc.features.map((f) => ({
        ...f,
        geometry: flipGeometry(f.geometry),
      })),
    } as FeatureCollection;
  }
  if (geojson.type === "Feature") {
    const f = geojson as Feature;
    return { ...f, geometry: flipGeometry(f.geometry) } as Feature;
  }
  return flipGeometry(geojson as Geometry | GeometryCollection) as AnyGeoJSON;
}
