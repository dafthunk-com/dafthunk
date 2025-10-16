import { NodeExecution, NodeType } from "@dafthunk/types";
import { lineChunk } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class LineChunkNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "line-chunk",
    name: "Line Chunk",
    type: "line-chunk",
    description: "Breaks a LineString into chunks of a specified length.",
    tags: ["Geo"],
    icon: "scissors",
    documentation: "This node splits a line into smaller segments or chunks.",
    inlinable: true,
    inputs: [
      {
        name: "line",
        type: "geojson",
        description: "LineString feature to chunk",
        required: true,
      },
      {
        name: "length",
        type: "number",
        description: "Length of each chunk in kilometers",
        required: true,
      },
      {
        name: "reverse",
        type: "boolean",
        description:
          "Reverse coordinates to start the first chunked segment at the end (default: false)",
        required: false,
      },
    ],
    outputs: [
      {
        name: "chunks",
        type: "geojson",
        description: "FeatureCollection of LineString chunks",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { line, length, reverse } = context.inputs;

      if (!line) {
        return this.createErrorResult("Missing line input");
      }

      if (length === undefined || length === null) {
        return this.createErrorResult("Missing length input");
      }

      if (typeof length !== "number") {
        return this.createErrorResult("Length must be a number");
      }

      if (length <= 0) {
        return this.createErrorResult("Length must be a positive number");
      }

      // Prepare options for lineChunk
      const options: { reverse?: boolean } = {};

      if (reverse !== undefined && reverse !== null) {
        if (typeof reverse !== "boolean") {
          return this.createErrorResult("Reverse must be a boolean");
        }
        options.reverse = reverse;
      }

      // Delegate everything to Turf.js lineChunk function
      const chunkFeatures = lineChunk(line as any, length, options);

      return this.createSuccessResult({
        chunks: chunkFeatures,
      });
    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(`Error chunking line: ${error.message}`);
    }
  }
}
