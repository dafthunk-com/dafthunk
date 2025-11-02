import { Node } from "@dafthunk/types";
import { NodeExecution, NodeType } from "@dafthunk/types";

import { ExecutableNode, NodeContext, ParameterValue } from "../types";

/**
 * Test All Types Node
 *
 * A test node that accepts all available parameter types as inputs
 * and returns them as outputs. Useful for testing UI field components
 * and type handling across the system.
 */
export class TestAllTypesNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "test-all-types",
    name: "Test All Types",
    type: "test-all-types",
    description:
      "Test node with all available parameter types as inputs and outputs. Passes through all input values to corresponding outputs.",
    tags: ["Test", "Development", "Types"],
    icon: "flask-conical",
    documentation:
      "This node provides inputs and outputs for all available parameter types. It's useful for testing field components, type handling, and debugging workflows.",
    inlinable: true,
    inputs: [
      {
        name: "string",
        type: "string",
        description: "String input",
        value: "Hello, World!",
      },
      {
        name: "date",
        type: "date",
        description: "Date input (ISO 8601 timestamp)",
        value: "2025-01-15T12:00:00Z",
      },
      {
        name: "number",
        type: "number",
        description: "Number input",
        value: 42,
      },
      {
        name: "boolean",
        type: "boolean",
        description: "Boolean input",
        value: true,
      },
      {
        name: "image",
        type: "image",
        description: "Image input (ObjectReference)",
      },
      {
        name: "json",
        type: "json",
        description: "JSON object input",
        value: { key: "value", count: 123, enabled: true },
      },
      {
        name: "document",
        type: "document",
        description: "Document input (ObjectReference)",
      },
      {
        name: "audio",
        type: "audio",
        description: "Audio input (ObjectReference)",
      },
      {
        name: "buffergeometry",
        type: "buffergeometry",
        description: "BufferGeometry input (ObjectReference)",
      },
      {
        name: "gltf",
        type: "gltf",
        description: "GLTF input (ObjectReference)",
      },
      {
        name: "point",
        type: "point",
        description: "GeoJSON Point input",
        value: { type: "Point", coordinates: [0, 0] },
      },
      {
        name: "multipoint",
        type: "multipoint",
        description: "GeoJSON MultiPoint input",
        value: {
          type: "MultiPoint",
          coordinates: [
            [0, 0],
            [1, 1],
          ],
        },
      },
      {
        name: "linestring",
        type: "linestring",
        description: "GeoJSON LineString input",
        value: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 1],
            [2, 2],
          ],
        },
      },
      {
        name: "multilinestring",
        type: "multilinestring",
        description: "GeoJSON MultiLineString input",
        value: {
          type: "MultiLineString",
          coordinates: [
            [
              [0, 0],
              [1, 1],
            ],
            [
              [2, 2],
              [3, 3],
            ],
          ],
        },
      },
      {
        name: "polygon",
        type: "polygon",
        description: "GeoJSON Polygon input",
        value: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
              [0, 0],
            ],
          ],
        },
      },
      {
        name: "multipolygon",
        type: "multipolygon",
        description: "GeoJSON MultiPolygon input",
        value: {
          type: "MultiPolygon",
          coordinates: [
            [
              [
                [0, 0],
                [1, 0],
                [1, 1],
                [0, 1],
                [0, 0],
              ],
            ],
            [
              [
                [2, 2],
                [3, 2],
                [3, 3],
                [2, 3],
                [2, 2],
              ],
            ],
          ],
        },
      },
      {
        name: "geometry",
        type: "geometry",
        description: "GeoJSON Geometry input",
        value: { type: "Point", coordinates: [0, 0] },
      },
      {
        name: "geometrycollection",
        type: "geometrycollection",
        description: "GeoJSON GeometryCollection input",
        value: {
          type: "GeometryCollection",
          geometries: [
            { type: "Point", coordinates: [0, 0] },
            {
              type: "LineString",
              coordinates: [
                [1, 1],
                [2, 2],
              ],
            },
          ],
        },
      },
      {
        name: "feature",
        type: "feature",
        description: "GeoJSON Feature input",
        value: {
          type: "Feature",
          geometry: { type: "Point", coordinates: [0, 0] },
          properties: { name: "Sample Point" },
        },
      },
      {
        name: "featurecollection",
        type: "featurecollection",
        description: "GeoJSON FeatureCollection input",
        value: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: { type: "Point", coordinates: [0, 0] },
              properties: { name: "Point 1" },
            },
            {
              type: "Feature",
              geometry: { type: "Point", coordinates: [1, 1] },
              properties: { name: "Point 2" },
            },
          ],
        },
      },
      {
        name: "geojson",
        type: "geojson",
        description: "GeoJSON input (any GeoJSON type)",
        value: { type: "Point", coordinates: [0, 0] },
      },
      {
        name: "secret",
        type: "secret",
        description: "Secret reference input",
      },
      {
        name: "any",
        type: "any",
        description: "Any type input",
        value: "This can be any type",
      },
    ],
    outputs: [
      {
        name: "string",
        type: "string",
        description: "String output",
      },
      {
        name: "date",
        type: "date",
        description: "Date output (ISO 8601 timestamp)",
      },
      {
        name: "number",
        type: "number",
        description: "Number output",
      },
      {
        name: "boolean",
        type: "boolean",
        description: "Boolean output",
      },
      {
        name: "image",
        type: "image",
        description: "Image output (ObjectReference)",
      },
      {
        name: "json",
        type: "json",
        description: "JSON object output",
      },
      {
        name: "document",
        type: "document",
        description: "Document output (ObjectReference)",
      },
      {
        name: "audio",
        type: "audio",
        description: "Audio output (ObjectReference)",
      },
      {
        name: "buffergeometry",
        type: "buffergeometry",
        description: "BufferGeometry output (ObjectReference)",
      },
      {
        name: "gltf",
        type: "gltf",
        description: "GLTF output (ObjectReference)",
      },
      {
        name: "point",
        type: "point",
        description: "GeoJSON Point output",
      },
      {
        name: "multipoint",
        type: "multipoint",
        description: "GeoJSON MultiPoint output",
      },
      {
        name: "linestring",
        type: "linestring",
        description: "GeoJSON LineString output",
      },
      {
        name: "multilinestring",
        type: "multilinestring",
        description: "GeoJSON MultiLineString output",
      },
      {
        name: "polygon",
        type: "polygon",
        description: "GeoJSON Polygon output",
      },
      {
        name: "multipolygon",
        type: "multipolygon",
        description: "GeoJSON MultiPolygon output",
      },
      {
        name: "geometry",
        type: "geometry",
        description: "GeoJSON Geometry output",
      },
      {
        name: "geometrycollection",
        type: "geometrycollection",
        description: "GeoJSON GeometryCollection output",
      },
      {
        name: "feature",
        type: "feature",
        description: "GeoJSON Feature output",
      },
      {
        name: "featurecollection",
        type: "featurecollection",
        description: "GeoJSON FeatureCollection output",
      },
      {
        name: "geojson",
        type: "geojson",
        description: "GeoJSON output (any GeoJSON type)",
      },
      {
        name: "secret",
        type: "secret",
        description: "Secret reference output",
      },
      {
        name: "any",
        type: "any",
        description: "Any type output",
      },
    ],
  };

  constructor(node: Node) {
    super(node);
  }

  async execute(context: NodeContext): Promise<NodeExecution> {
    // Simply pass through all inputs to outputs
    const outputs: Record<string, ParameterValue> = {};

    for (const input of TestAllTypesNode.nodeType.inputs) {
      const value = context.inputs[input.name];
      if (value !== undefined) {
        outputs[input.name] = value;
      }
    }

    return this.createSuccessResult(outputs);
  }
}
