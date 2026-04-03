import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * Google Air Quality node implementation
 * Retrieves current air quality conditions for a location
 */
export class AirQualityGoogleNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "air-quality-google",
    name: "Air Quality (Google)",
    type: "air-quality-google",
    description:
      "Get current air quality index, pollutants, and health recommendations",
    tags: ["Google", "Air Quality", "Environment", "Weather"],
    icon: "cloud",
    documentation:
      "This node retrieves current air quality conditions for a given latitude/longitude using the Google Air Quality API. Returns AQI index, pollutant concentrations, and health recommendations.",
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
      {
        name: "languageCode",
        type: "string",
        description: "Language code (e.g., en, fr, de). Defaults to en.",
        required: false,
        hidden: true,
      },
    ],
    outputs: [
      {
        name: "aqi",
        type: "number",
        description: "Air Quality Index value",
      },
      {
        name: "category",
        type: "string",
        description: "AQI category (e.g., Good, Moderate, Unhealthy)",
      },
      {
        name: "dominantPollutant",
        type: "string",
        description: "Dominant pollutant code (e.g., pm25, o3)",
      },
      {
        name: "pollutants",
        type: "json",
        description: "Array of pollutant details with concentrations",
      },
      {
        name: "healthRecommendations",
        type: "json",
        description: "Health recommendations by population group",
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { latitude, longitude, languageCode } = context.inputs;
      const apiKey = context.env.GOOGLE_API_KEY;

      if (!apiKey) {
        return this.createErrorResult("GOOGLE_API_KEY is not configured");
      }

      if (typeof latitude !== "number" || typeof longitude !== "number") {
        return this.createErrorResult("Latitude and longitude are required");
      }

      const url = `https://airquality.googleapis.com/v1/currentConditions:lookup?key=${apiKey}`;

      const body: Record<string, unknown> = {
        location: { latitude, longitude },
        extraComputations: [
          "HEALTH_RECOMMENDATIONS",
          "DOMINANT_POLLUTANT_CONCENTRATION",
          "POLLUTANT_CONCENTRATION",
          "LOCAL_AQI",
        ],
        universalAqi: true,
      };

      if (languageCode && typeof languageCode === "string") {
        body.languageCode = languageCode;
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Dafthunk/1.0",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        return this.createErrorResult(
          `Air Quality API request failed with status ${response.status}`
        );
      }

      const data = (await response.json()) as {
        indexes?: Array<{
          code: string;
          displayName: string;
          aqi: number;
          category: string;
          dominantPollutant: string;
        }>;
        pollutants?: Array<{
          code: string;
          displayName: string;
          fullName: string;
          concentration: { value: number; units: string };
        }>;
        healthRecommendations?: Record<string, string>;
      };

      const primaryIndex = data.indexes?.[0];

      return this.createSuccessResult({
        aqi: primaryIndex?.aqi ?? null,
        category: primaryIndex?.category ?? "",
        dominantPollutant: primaryIndex?.dominantPollutant ?? "",
        pollutants: data.pollutants ?? [],
        healthRecommendations: data.healthRecommendations ?? {},
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error querying Air Quality API"
      );
    }
  }
}
