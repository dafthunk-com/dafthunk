import { NodeExecution, NodeType } from "@dafthunk/types";
import { lineSplit } from "@turf/turf";

import { ExecutableNode } from "../types";
import { NodeContext } from "../types";

export class LineSplitNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "line-split",
    name: "Line Split",
    type: "line-split",
    description: "Split a LineString by another GeoJSON Feature.",
    tags: ["Geo"],
    icon: "git-merge",
    inputs: [
      {
        name: "line",
        type: "geojson",
        description: "LineString Feature to split",
        required: true,
      },
      {
        name: "splitter",
        type: "geojson",
        description: "Feature used to split line",
        required: true,
      },
    ],
    outputs: [
      {
        name: "split",
        type: "geojson",
        description: "FeatureCollection of split LineStrings",
      },
    ],
  };

  public async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { line, splitter } = context.inputs;

      if (!line) {
        return this.createErrorResult("Missing line input");
      }

      if (!splitter) {
        return this.createErrorResult("Missing splitter input");
      }

      // Delegate everything to Turf.js lineSplit function
      const splitLines = lineSplit(line as any, splitter as any);

      return this.createSuccessResult({
        split: splitLines,
      });

    } catch (err) {
      const error = err as Error;
      return this.createErrorResult(`Error splitting line: ${error.message}`);
    }
  }
} 