import * as polyclip from "polyclip-ts";
import { polygon } from "./helpers";
import type {
  BBox,
  Coordinate,
  Feature,
  FeatureCollection,
  MultiPolygon,
  Polygon,
} from "./types";

type PolyclipGeom = polyclip.Geom;

function toPolyclipGeom(geom: Polygon | MultiPolygon): PolyclipGeom {
  if (geom.type === "Polygon") {
    return (geom as Polygon).coordinates as unknown as PolyclipGeom;
  }
  return (geom as MultiPolygon).coordinates as unknown as PolyclipGeom;
}

function _getPolygonGeom(
  feat: Feature<Polygon | MultiPolygon> | Polygon | MultiPolygon
): Polygon | MultiPolygon {
  if (feat.type === "Feature")
    return (feat as Feature<Polygon | MultiPolygon>).geometry;
  return feat as Polygon | MultiPolygon;
}

function fromPolyclipResult(
  result: polyclip.Geom,
  properties?: Record<string, unknown> | null
): Feature<Polygon | MultiPolygon> | null {
  if (!result || (result as number[][][][]).length === 0) return null;

  // polyclip always returns MultiPolygon format
  const multiCoords = result as number[][][][];

  if (multiCoords.length === 1) {
    return {
      type: "Feature",
      properties: properties ?? {},
      geometry: {
        type: "Polygon",
        coordinates: multiCoords[0] as Coordinate[][],
      },
    } as Feature<Polygon>;
  }

  return {
    type: "Feature",
    properties: properties ?? {},
    geometry: {
      type: "MultiPolygon",
      coordinates: multiCoords as Coordinate[][][],
    },
  } as Feature<MultiPolygon>;
}

export function union(
  features: FeatureCollection<Polygon | MultiPolygon>,
  options?: { properties?: Record<string, unknown> }
): Feature<Polygon | MultiPolygon> | null {
  const feats = features.features;
  if (feats.length === 0) return null;
  if (feats.length === 1) {
    return {
      type: "Feature",
      properties: options?.properties ?? feats[0].properties ?? {},
      geometry: feats[0].geometry,
    };
  }

  const geoms = feats.map((f) => toPolyclipGeom(f.geometry));
  let result = geoms[0];
  for (let i = 1; i < geoms.length; i++) {
    result = polyclip.union(result, geoms[i]) as PolyclipGeom;
  }

  return fromPolyclipResult(result, options?.properties);
}

export function intersect(
  poly1: Feature<Polygon | MultiPolygon>,
  poly2: Feature<Polygon | MultiPolygon>,
  options?: { properties?: Record<string, unknown> }
): Feature<Polygon | MultiPolygon> | null {
  const geom1 = toPolyclipGeom(poly1.geometry);
  const geom2 = toPolyclipGeom(poly2.geometry);
  const result = polyclip.intersection(geom1, geom2);
  return fromPolyclipResult(
    result as PolyclipGeom,
    options?.properties ?? poly1.properties
  );
}

export function difference(
  poly1: Feature<Polygon | MultiPolygon>,
  poly2: Feature<Polygon | MultiPolygon>,
  options?: { properties?: Record<string, unknown> }
): Feature<Polygon | MultiPolygon> | null {
  const geom1 = toPolyclipGeom(poly1.geometry);
  const geom2 = toPolyclipGeom(poly2.geometry);
  const result = polyclip.difference(geom1, geom2);
  return fromPolyclipResult(
    result as PolyclipGeom,
    options?.properties ?? poly1.properties
  );
}

export function bboxClip(
  feature: Feature<Polygon | MultiPolygon>,
  bb: BBox
): Feature<Polygon | MultiPolygon> {
  const clipPoly: Polygon = {
    type: "Polygon",
    coordinates: [
      [
        [bb[0], bb[1]],
        [bb[2], bb[1]],
        [bb[2], bb[3]],
        [bb[0], bb[3]],
        [bb[0], bb[1]],
      ],
    ],
  };

  const geom1 = toPolyclipGeom(feature.geometry);
  const geom2 = toPolyclipGeom(clipPoly);
  const result = polyclip.intersection(geom1, geom2);

  const clipped = fromPolyclipResult(
    result as PolyclipGeom,
    feature.properties
  );
  if (!clipped) {
    // Return empty polygon if no intersection
    return {
      type: "Feature",
      properties: feature.properties ?? {},
      geometry: { type: "Polygon", coordinates: [] as Coordinate[][] },
    } as Feature<Polygon>;
  }
  return clipped;
}

export function mask(
  poly: Feature<Polygon | MultiPolygon> | Polygon,
  maskPoly?: Feature<Polygon> | Polygon
): Feature<Polygon> {
  const geom = poly.type === "Feature" ? (poly as Feature).geometry : poly;
  const props = poly.type === "Feature" ? (poly as Feature).properties : {};

  // Default mask is the entire world
  const maskCoords: Coordinate[][] = maskPoly
    ? ((maskPoly.type === "Feature"
        ? (maskPoly as Feature<Polygon>).geometry.coordinates
        : (maskPoly as Polygon).coordinates) as Coordinate[][])
    : [
        [
          [-180, -90],
          [180, -90],
          [180, 90],
          [-180, 90],
          [-180, -90],
        ],
      ];

  // The mask is the outer polygon with the input polygon as a hole
  const outerRing = maskCoords[0];

  if (geom.type === "Polygon") {
    const innerRing = (geom as Polygon).coordinates[0] as Coordinate[];
    return polygon([outerRing, innerRing], props ?? {});
  }

  // MultiPolygon - add all outer rings as holes
  const rings: Coordinate[][] = [outerRing];
  for (const polyCoords of (geom as MultiPolygon).coordinates) {
    rings.push((polyCoords as Coordinate[][])[0]);
  }
  return polygon(rings, props ?? {});
}
