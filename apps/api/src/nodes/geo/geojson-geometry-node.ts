import { NodeExecution, NodeType } from "@dafthunk/types";
import {
  Geometry,
  GeometryCollection,
  LineString,
  MultiLineString,
  MultiPoint,
  MultiPolygon,
  Point,
  Polygon,
} from "@dafthunk/types";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class GeoJsonGeometryNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "geojson-geometry",
    name: "GeoJSON Geometry",
    type: "geojson-geometry",
    description: "Parse a GeoJSON geometry object from JSON input",
    tags: ["Geo"],
    icon: "map",
    inputs: [
      {
        name: "json",
        type: "json",
        description: "The GeoJSON geometry object to parse",
        required: true,
      },
    ],
    outputs: [
      {
        name: "geojson",
        type: "geojson",
        description: "The parsed geometry object",
      },
      {
        name: "geometryType",
        type: "string",
        description: "The type of geometry (Point, LineString, etc.)",
        hidden: true,
      },
    ],
  };

  private isValidCoordinate(coord: any): coord is [number, number] | [number, number, number] {
    return (
      Array.isArray(coord) &&
      (coord.length === 2 || coord.length === 3) &&
      coord.every((c) => typeof c === "number" && !isNaN(c))
    );
  }

  private isValidPoint(geom: any): geom is Point {
    return (
      geom?.type === "Point" &&
      this.isValidCoordinate(geom.coordinates)
    );
  }

  private isValidMultiPoint(geom: any): geom is MultiPoint {
    return (
      geom?.type === "MultiPoint" &&
      Array.isArray(geom.coordinates) &&
      geom.coordinates.every((coord: any) => this.isValidCoordinate(coord))
    );
  }

  private isValidLineString(geom: any): geom is LineString {
    return (
      geom?.type === "LineString" &&
      Array.isArray(geom.coordinates) &&
      geom.coordinates.length >= 2 &&
      geom.coordinates.every((coord: any) => this.isValidCoordinate(coord))
    );
  }

  private isValidMultiLineString(geom: any): geom is MultiLineString {
    return (
      geom?.type === "MultiLineString" &&
      Array.isArray(geom.coordinates) &&
      geom.coordinates.every((line: any) => 
        Array.isArray(line) &&
        line.length >= 2 &&
        line.every((coord: any) => this.isValidCoordinate(coord))
      )
    );
  }

  private isValidPolygon(geom: any): geom is Polygon {
    return (
      geom?.type === "Polygon" &&
      Array.isArray(geom.coordinates) &&
      geom.coordinates.length >= 1 &&
      geom.coordinates.every((ring: any) => 
        Array.isArray(ring) &&
        ring.length >= 4 && // minimum 4 points to close a ring
        ring.every((coord: any) => this.isValidCoordinate(coord))
      )
    );
  }

  private isValidMultiPolygon(geom: any): geom is MultiPolygon {
    return (
      geom?.type === "MultiPolygon" &&
      Array.isArray(geom.coordinates) &&
      geom.coordinates.every((polygon: any) => 
        Array.isArray(polygon) &&
        polygon.length >= 1 &&
        polygon.every((ring: any) => 
          Array.isArray(ring) &&
          ring.length >= 4 &&
          ring.every((coord: any) => this.isValidCoordinate(coord))
        )
      )
    );
  }

  private isValidGeometry(geom: any): geom is Geometry {
    return (
      this.isValidPoint(geom) ||
      this.isValidMultiPoint(geom) ||
      this.isValidLineString(geom) ||
      this.isValidMultiLineString(geom) ||
      this.isValidPolygon(geom) ||
      this.isValidMultiPolygon(geom)
    );
  }

  private isValidGeometryCollection(geom: any): geom is GeometryCollection {
    return (
      geom?.type === "GeometryCollection" &&
      Array.isArray(geom.geometries) &&
      geom.geometries.every((g: any) => this.isValidGeometry(g))
    );
  }

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { json } = context.inputs;

      if (!json || typeof json !== "object") {
        return this.createErrorResult("Invalid or missing JSON input");
      }

      // Check if it's a valid geometry or geometry collection
      if (this.isValidGeometry(json)) {
        return this.createSuccessResult({
          geojson: json,
          geometryType: json.type,
        });
      }

      if (this.isValidGeometryCollection(json)) {
        return this.createSuccessResult({
          geojson: json,
          geometryType: json.type,
        });
      }

      // Provide specific error messages based on what's wrong
      if (!json.type) {
        return this.createErrorResult("Missing 'type' property in GeoJSON geometry");
      }

      if (!json.coordinates && json.type !== "GeometryCollection") {
        return this.createErrorResult("Missing 'coordinates' property in GeoJSON geometry");
      }

      const validTypes = [
        "Point", "MultiPoint", "LineString", "MultiLineString", 
        "Polygon", "MultiPolygon", "GeometryCollection"
      ];
      
      if (!validTypes.includes(json.type)) {
        return this.createErrorResult(
          `Invalid geometry type '${json.type}'. Must be one of: ${validTypes.join(", ")}`
        );
      }

      return this.createErrorResult(
        `Invalid GeoJSON ${json.type} geometry: coordinates structure is malformed`
      );

    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(`Error parsing GeoJSON geometry: ${error.message}`);
    }
  }
} 