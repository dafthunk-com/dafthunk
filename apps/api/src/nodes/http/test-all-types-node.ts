import { Node, NodeExecution, NodeType } from "@dafthunk/types";

import {
  ExecutableNode,
  NodeContext,
  ParameterValue,
} from "../../runtime/node-types";

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
        name: "gltf",
        type: "gltf",
        description: "GLTF input (ObjectReference)",
      },
      {
        name: "geojson",
        type: "geojson",
        description: "GeoJSON input",
        value: {
          type: "Feature",
          geometry: { type: "Point", coordinates: [0, 0] },
          properties: { name: "Sample Point" },
        },
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
        name: "gltf",
        type: "gltf",
        description: "GLTF output (ObjectReference)",
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
