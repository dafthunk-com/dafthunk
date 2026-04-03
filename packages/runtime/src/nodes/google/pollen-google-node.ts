import { ExecutableNode, type NodeContext } from "@dafthunk/runtime";
import type { NodeExecution, NodeType } from "@dafthunk/types";

/**
 * Google Pollen node implementation
 * Retrieves pollen forecast for a location
 */
export class PollenGoogleNode extends ExecutableNode {
  public static readonly nodeType: NodeType = {
    id: "pollen-google",
    name: "Pollen (Google)",
    type: "pollen-google",
    description: "Get pollen forecast for a location",
    tags: ["Google", "Pollen", "Environment", "Health"],
    icon: "flower",
    documentation:
      "This node retrieves pollen forecasts for a given latitude/longitude using the Google Pollen API. Returns pollen type info (grass, tree, weed), index values, and plant-specific data.",
    usage: 100,
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
        name: "days",
        type: "number",
        description: "Number of forecast days (1-5, default 1)",
        required: false,
        hidden: true,
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
        name: "dailyInfo",
        type: "json",
        description:
          "Array of daily pollen forecasts with pollen type and plant info",
      },
      {
        name: "regionCode",
        type: "string",
        description: "Region code for the location",
        hidden: true,
      },
    ],
  };

  async execute(context: NodeContext): Promise<NodeExecution> {
    try {
      const { latitude, longitude, days, languageCode } = context.inputs;
      const apiKey = context.env.GOOGLE_API_KEY;

      if (!apiKey) {
        return this.createErrorResult("GOOGLE_API_KEY is not configured");
      }

      if (typeof latitude !== "number" || typeof longitude !== "number") {
        return this.createErrorResult("Latitude and longitude are required");
      }

      const url = new URL("https://pollen.googleapis.com/v1/forecast:lookup");
      url.searchParams.set("key", apiKey);
      url.searchParams.set("location.latitude", latitude.toString());
      url.searchParams.set("location.longitude", longitude.toString());
      url.searchParams.set(
        "days",
        days && typeof days === "number"
          ? Math.min(5, Math.max(1, days)).toString()
          : "1"
      );
      url.searchParams.set("plantsDescription", "true");

      if (languageCode && typeof languageCode === "string") {
        url.searchParams.set("languageCode", languageCode);
      }

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: { "User-Agent": "Dafthunk/1.0" },
      });

      if (!response.ok) {
        return this.createErrorResult(
          `Pollen API request failed with status ${response.status}`
        );
      }

      const data = (await response.json()) as {
        regionCode?: string;
        dailyInfo?: Array<{
          date: { year: number; month: number; day: number };
          pollenTypeInfo?: Array<{
            code: string;
            displayName: string;
            indexInfo?: {
              value: number;
              category: string;
            };
          }>;
          plantInfo?: Array<{
            code: string;
            displayName: string;
            indexInfo?: {
              value: number;
              category: string;
            };
          }>;
        }>;
      };

      return this.createSuccessResult({
        dailyInfo: data.dailyInfo ?? [],
        regionCode: data.regionCode ?? "",
      });
    } catch (error) {
      return this.createErrorResult(
        error instanceof Error
          ? error.message
          : "Unknown error querying Pollen API"
      );
    }
  }
}
