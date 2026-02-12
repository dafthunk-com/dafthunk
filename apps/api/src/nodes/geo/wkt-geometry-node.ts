import {
  Geometry,
  GeometryCollection,
  NodeExecution,
  NodeType,
} from "@dafthunk/types";
import wellknown from "wellknown";
import { ExecutableNode, NodeContext } from "@dafthunk/runtime";

export class WktGeometryNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "wkt-geometry",
    name: "WKT Geometry",
    type: "wkt-geometry",
    description:
      "Parse a Well-Known Text (WKT) geometry string and convert to GeoJSON",
    tags: ["Geo", "WKT", "Geometry"],
    icon: "map",
    documentation:
      "This node converts between Well-Known Text (WKT) format and GeoJSON geometry.",
    inlinable: true,
    inputs: [
      {
        name: "wkt",
        type: "string",
        description: "The WKT geometry string to parse",
        required: true,
      },
    ],
    outputs: [
      {
        name: "geojson",
        type: "geojson",
        description: "The parsed geometry object in GeoJSON format",
      },
    ],
  };

  private isValidGeometry(geom: any): geom is Geometry | GeometryCollection {
    if (!geom || typeof geom !== "object" || !geom.type) {
      return false;
    }

    const validTypes = [
      "Point",
      "MultiPoint",
      "LineString",
      "MultiLineString",
      "Polygon",
      "MultiPolygon",
      "GeometryCollection",
    ];

    return validTypes.includes(geom.type);
  }

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { wkt } = context.inputs;

      if (wkt === undefined || wkt === null || typeof wkt !== "string") {
        return this.createErrorResult("Invalid or missing WKT string input");
      }

      // Trim whitespace from the WKT string
      const trimmedWkt = wkt.trim();

      if (trimmedWkt.length === 0) {
        return this.createErrorResult("Empty WKT string provided");
      }

      // Parse the WKT string using wellknown library
      const parsedGeometry = wellknown.parse(trimmedWkt);

      if (!parsedGeometry) {
        return this.createErrorResult(
          "Failed to parse WKT string: invalid or unsupported WKT format"
        );
      }

      // Validate the parsed geometry
      if (!this.isValidGeometry(parsedGeometry)) {
        return this.createErrorResult(
          "Parsed WKT resulted in invalid geometry"
        );
      }

      return this.createSuccessResult({
        geojson: parsedGeometry,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(
        `Error parsing WKT geometry: ${error.message}`
      );
    }
  }
}
