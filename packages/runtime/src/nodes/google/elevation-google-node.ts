import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * Google Maps Elevation node implementation
 * Retrieves elevation data for a location
 */
export class ElevationGoogleNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "elevation-google",
    name: "Elevation (Google)",
    type: "elevation-google",
    description: "Get elevation for a geographic location",
    tags: ["Google", "Maps", "Elevation", "Geo"],
    icon: "mountain",
    documentation:
      "This node retrieves elevation data for a given latitude/longitude using the Google Maps Elevation API. Returns elevation in meters and data resolution.",
    usage: 10,
    asTool: true,
    inputs: [
      {
        name: "latitude",
        type: "number",
        description: "Latitude of the location",
        required: true,
      },
      {
        name: "longitude",
        type: "number",
        description: "Longitude of the location",
        required: true,
      },
    ],
    outputs: [
      {
        name: "elevation",
        type: "number",
        description: "Elevation in meters above sea level",
      },
      {
        name: "resolution",
        type: "number",
        description:
          "Max distance between data points used for interpolation (meters)",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { latitude, longitude } = context.inputs;
      const apiKey = context.env.GOOGLE_API_KEY;

      if (!apiKey) {
        return this.createErrorResult("GOOGLE_API_KEY is not configured");
      }

      if (typeof latitude !== "number" || typeof longitude !== "number") {
        return this.createErrorResult("Latitude and longitude are required");
      }

      const url = new URL(
        "https://maps.googleapis.com/maps/api/elevation/json"
      );
      url.searchParams.set("key", apiKey);
      url.searchParams.set("locations", `${latitude},${longitude}`);

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: { "User-Agent": "Dafthunk/1.0" },
      });

      if (!response.ok) {
        return this.createErrorResult(
          `Elevation API request failed with status ${response.status}`
        );
      }

      const data = (await response.json()) as {
        status: string;
        results: Array<{
          elevation: number;
          location: { lat: number; lng: number };
          resolution: number;
        }>;
      };

      if (data.status !== "OK") {
        return this.createErrorResult(`Elevation API error: ${data.status}`);
      }

      const result = data.results[0];

      return this.createSuccessResult({
        elevation: result.elevation,
        resolution: result.resolution,
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error querying Elevation API"
      );
    }
  }
}
