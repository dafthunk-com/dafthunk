import type { GeoPath } from "d3-geo";
import { geoIdentity, geoPath } from "d3-geo";

/**
 * Sanitizes a color value to prevent SVG attribute injection.
 * Only allows safe CSS color formats: hex, rgb/rgba, hsl/hsla, and named colors.
 */
function sanitizeColor(color: string, defaultColor: string): string {
  if (typeof color !== "string") return defaultColor;

  const trimmed = color.trim();

  // Hex colors: #RGB, #RRGGBB, #RRGGBBAA
  if (/^#[0-9a-f]{3,8}$/i.test(trimmed)) return trimmed;

  // RGB/RGBA: rgb(r, g, b) or rgba(r, g, b, a)
  if (/^rgba?\(\s*[\d.%,\s/]+\s*\)$/i.test(trimmed)) return trimmed;

  // HSL/HSLA: hsl(h, s%, l%) or hsla(h, s%, l%, a)
  if (/^hsla?\(\s*[\d.%,\s/]+\s*\)$/i.test(trimmed)) return trimmed;

  // Named colors (letters only, no special chars)
  if (/^[a-z]+$/i.test(trimmed)) return trimmed;

  // Reject anything else (potential injection)
  return defaultColor;
}

// Basic GeoJSON type definitions
interface GeoJSONGeometry {
  type: string;
  coordinates: number[] | number[][] | number[][][] | number[][][][];
  geometries?: GeoJSONGeometry[];
}

interface GeoJSONFeature {
  type: "Feature";
  geometry: GeoJSONGeometry;
  properties: Record<string, unknown>;
}

interface GeoJSONFeatureCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}

type GeoJSON = GeoJSONGeometry | GeoJSONFeature | GeoJSONFeatureCollection;

export interface GeoJSONSvgOptions {
  width?: number;
  height?: number;
  strokeColor?: string;
  strokeWidth?: number;
  fillColor?: string;
  backgroundColor?: string;
  minX?: number;
  minY?: number;
  maxX?: number;
  maxY?: number;
}

export interface GeoJSONSvgResult {
  svg: string;
  paths: string[];
  error: string | null;
}

/**
 * Extracts all coordinates from GeoJSON for bounding box calculation
 */
export function extractCoordinates(geojson: GeoJSON): number[][] {
  const coords: number[][] = [];

  const processGeometry = (geometry: GeoJSONGeometry) => {
    if (!geometry || !geometry.coordinates) return;

    const addCoord = (coord: number[]) => {
      if (coord.length >= 2) {
        coords.push([coord[0], coord[1]]);
      }
    };

    const processCoords = (
      coordinates: number[] | number[][] | number[][][] | number[][][][],
      depth: number
    ) => {
      if (depth === 0) {
        if (
          Array.isArray(coordinates) &&
          coordinates.length >= 2 &&
          typeof coordinates[0] === "number"
        ) {
          addCoord(coordinates as number[]);
        }
      } else if (Array.isArray(coordinates)) {
        coordinates.forEach((coord) => {
          if (Array.isArray(coord)) {
            processCoords(coord, depth - 1);
          }
        });
      }
    };

    switch (geometry.type) {
      case "Point":
        processCoords(geometry.coordinates, 0);
        break;
      case "MultiPoint":
      case "LineString":
        processCoords(geometry.coordinates, 1);
        break;
      case "MultiLineString":
      case "Polygon":
        processCoords(geometry.coordinates, 2);
        break;
      case "MultiPolygon":
        processCoords(geometry.coordinates, 3);
        break;
      case "GeometryCollection":
        geometry.geometries?.forEach(processGeometry);
        break;
    }
  };

  const processFeature = (feature: GeoJSONFeature) => {
    if (feature.geometry) {
      processGeometry(feature.geometry);
    }
  };

  if (geojson.type === "FeatureCollection") {
    (geojson as GeoJSONFeatureCollection).features?.forEach(processFeature);
  } else if (geojson.type === "Feature") {
    processFeature(geojson as GeoJSONFeature);
  } else if (geojson.type && (geojson as GeoJSONGeometry).coordinates) {
    processGeometry(geojson as GeoJSONGeometry);
  }

  return coords;
}

/**
 * Sets up projection with proper fitting based on GeoJSON bounds
 */
export function setupProjection(
  geojson: GeoJSON,
  options: GeoJSONSvgOptions
): ReturnType<typeof geoIdentity> {
  const { width = 400, height = 300, minX, minY, maxX, maxY } = options;
  const proj = geoIdentity();

  // If custom viewport bounds are provided, use them
  if (
    minX !== undefined &&
    minY !== undefined &&
    maxX !== undefined &&
    maxY !== undefined
  ) {
    const bboxFeature = {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [minX, minY],
            [maxX, minY],
            [maxX, maxY],
            [minX, maxY],
            [minX, minY],
          ],
        ],
      },
      properties: {},
    };

    proj.fitExtent(
      [
        [0, 0],
        [width, height],
      ],
      bboxFeature as unknown as Parameters<typeof proj.fitExtent>[1]
    );
    return proj;
  }

  const coords = extractCoordinates(geojson);

  if (coords.length === 0) {
    // Default to world view if no coordinates
    const worldFeature = {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-180, -90],
            [180, -90],
            [180, 90],
            [-180, 90],
            [-180, -90],
          ],
        ],
      },
      properties: {},
    };

    proj.fitExtent(
      [
        [0, 0],
        [width, height],
      ],
      worldFeature as unknown as Parameters<typeof proj.fitExtent>[1]
    );
    return proj;
  }

  // Calculate bounding box
  let minXCoord = coords[0][0];
  let maxXCoord = coords[0][0];
  let minYCoord = coords[0][1];
  let maxYCoord = coords[0][1];

  coords.forEach(([x, y]) => {
    minXCoord = Math.min(minXCoord, x);
    maxXCoord = Math.max(maxXCoord, x);
    minYCoord = Math.min(minYCoord, y);
    maxYCoord = Math.max(maxYCoord, y);
  });

  // Handle single points or very small geometries
  const bboxWidth = maxXCoord - minXCoord;
  const bboxHeight = maxYCoord - minYCoord;
  const minDimension = 0.1;

  if (bboxWidth === 0) {
    minXCoord -= minDimension / 2;
    maxXCoord += minDimension / 2;
  }
  if (bboxHeight === 0) {
    minYCoord -= minDimension / 2;
    maxYCoord += minDimension / 2;
  }

  // Create a bounding box feature for projection fitting
  const bboxFeature = {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [minXCoord, minYCoord],
          [maxXCoord, minYCoord],
          [maxXCoord, maxYCoord],
          [minXCoord, maxYCoord],
          [minXCoord, minYCoord],
        ],
      ],
    },
    properties: {},
  };

  proj.fitExtent(
    [
      [0, 0],
      [width, height],
    ],
    bboxFeature as unknown as Parameters<typeof proj.fitExtent>[1]
  );
  return proj;
}

/**
 * Generates SVG paths using D3 for a given GeoJSON
 */
export function generatePaths(
  geojson: GeoJSON,
  path: GeoPath
): { pathData: string; isPolygon: boolean }[] {
  const paths: { pathData: string; isPolygon: boolean }[] = [];

  const processGeometry = (geometry: GeoJSONGeometry) => {
    if (!geometry) return;

    const pathData = path(geometry as unknown as Parameters<GeoPath>[0]);
    if (pathData) {
      const isPolygon =
        geometry.type === "Polygon" || geometry.type === "MultiPolygon";
      paths.push({ pathData, isPolygon });
    }
  };

  const processFeature = (feature: GeoJSONFeature) => {
    if (feature.geometry) {
      processGeometry(feature.geometry);
    }
  };

  if (geojson.type === "FeatureCollection") {
    (geojson as GeoJSONFeatureCollection).features?.forEach(processFeature);
  } else if (geojson.type === "Feature") {
    processFeature(geojson as GeoJSONFeature);
  } else if (geojson.type && (geojson as GeoJSONGeometry).coordinates) {
    processGeometry(geojson as GeoJSONGeometry);
  }

  return paths;
}

/**
 * Main function to convert GeoJSON to SVG
 */
export function geojsonToSvg(
  geojson: GeoJSON,
  options: GeoJSONSvgOptions = {}
): GeoJSONSvgResult {
  const {
    width = 400,
    height = 300,
    strokeColor: rawStrokeColor = "#3b82f6",
    strokeWidth = 2,
    fillColor: rawFillColor = "rgba(59, 130, 246, 0.2)",
    backgroundColor: rawBackgroundColor = "#f8fafc",
  } = options;

  // Sanitize color inputs to prevent SVG attribute injection
  const strokeColor = sanitizeColor(rawStrokeColor, "#3b82f6");
  const fillColor = sanitizeColor(rawFillColor, "rgba(59, 130, 246, 0.2)");
  const backgroundColor = sanitizeColor(rawBackgroundColor, "#f8fafc");

  if (!geojson) {
    return {
      svg: "",
      paths: [],
      error: "No GeoJSON data provided",
    };
  }

  try {
    // Set up projection
    const proj = setupProjection(geojson, options);

    // Create path generator
    const path = geoPath().projection(proj);

    // Generate paths
    const paths = generatePaths(geojson, path);

    if (paths.length === 0) {
      return {
        svg: "",
        paths: [],
        error: "No valid geometries found",
      };
    }

    // Generate SVG content
    const pathElements = paths.map(({ pathData, isPolygon }) => {
      return `<path d="${pathData}" fill="${isPolygon ? fillColor : "none"}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>`;
    });

    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="${backgroundColor}"/>
  ${pathElements.join("\n  ")}
</svg>`;

    return {
      svg: svgContent,
      paths: paths.map((p) => p.pathData),
      error: null,
    };
  } catch (error) {
    return {
      svg: "",
      paths: [],
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
