import { Delaunay } from "d3-delaunay";
import { featureCollection, getCoord, polygon } from "./helpers";
import type {
  BBox,
  Coordinate,
  Feature,
  FeatureCollection,
  Point,
  Polygon,
} from "./types";

export function voronoi(
  points: FeatureCollection<Point>,
  options?: { bbox?: BBox }
): FeatureCollection<Polygon> {
  const bb = options?.bbox ?? [-180, -85, 180, 85];
  const coords = points.features.map((f) => getCoord(f) as number[]);

  if (coords.length === 0) {
    return featureCollection([]);
  }

  // Use d3-delaunay for Voronoi
  const flatCoords = new Float64Array(coords.length * 2);
  for (let i = 0; i < coords.length; i++) {
    flatCoords[i * 2] = coords[i][0];
    flatCoords[i * 2 + 1] = coords[i][1];
  }

  const delaunay = new Delaunay(flatCoords);
  const v = delaunay.voronoi([bb[0], bb[1], bb[2], bb[3]]);

  const polygons: Feature<Polygon>[] = [];
  for (let i = 0; i < coords.length; i++) {
    const cell = v.cellPolygon(i);
    if (cell) {
      // d3-delaunay returns [x,y] arrays already closed
      const ring = cell.map((c) => [c[0], c[1]] as Coordinate);
      polygons.push(polygon([ring], points.features[i].properties ?? {}));
    }
  }

  return featureCollection(polygons);
}
